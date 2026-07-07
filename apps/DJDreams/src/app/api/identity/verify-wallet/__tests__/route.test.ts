/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifySiwe = jest.fn()
const mockRequireSession = jest.fn()
const mockUpdateSessionUsername = jest.fn()
const mockUpdateSessionWalletAuth = jest.fn()
const mockConsumeNonce = jest.fn()
const mockResolveUsernameByAddress = jest.fn()

// Override the global jest.setup.js mock for @worldcoin/minikit-js so the route
// picks up our mocked verifySiweMessage instead of the browser-only MiniKit stub.
jest.mock('@worldcoin/minikit-js', () => ({
  verifySiweMessage: (...args: unknown[]) => mockVerifySiwe(...args),
  MiniKit: { isInstalled: () => false },
}))

jest.mock('@/lib/domains/identity/auth', () => ({
  requireSession: () => mockRequireSession(),
}))

jest.mock('@/lib/domains/identity/session', () => ({
  updateSessionUsername: (...args: unknown[]) => mockUpdateSessionUsername(...args),
  updateSessionWalletAuth: (...args: unknown[]) => mockUpdateSessionWalletAuth(...args),
}))

jest.mock('@/lib/domains/identity/world-usernames-server', () => ({
  resolveUsernameByAddress: (...args: unknown[]) => mockResolveUsernameByAddress(...args),
}))

jest.mock('@/lib/domains/identity/nonce-store', () => {
  const actual = jest.requireActual<typeof import('@/lib/domains/identity/nonce-store')>(
    '@/lib/domains/identity/nonce-store'
  )
  return {
    ...actual,
    consumeNonce: (...args: unknown[]) => mockConsumeNonce(...args),
  }
})

import { POST } from '../route'

const SESSION = {
  nullifier: '0xabc123',
  username: 'Human #abc123',
  session_token: 'tok_abc',
  created_at: '2025-01-01T00:00:00Z',
  last_seen_at: '2025-01-01T00:00:00Z',
}

function makePayload(address = '0xWALLET') {
  return {
    status: 'success' as const,
    version: 1,
    message: 'localhost wants you to sign in with your Ethereum account:\n0xWALLET\n\nSign in to DJ Dreams to show your World App username in chat.\n\nURI: http://localhost\nVersion: 1\nChain ID: 480\nNonce: nonce-123\nIssued At: 2025-01-01T00:00:00Z\nExpiration Time: 2099-01-01T00:00:00Z',
    signature: '0xdeadbeef',
    address,
  }
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/identity/verify-wallet', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/identity/verify-wallet', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConsumeNonce.mockReturnValue(true)
    // By default the public usernames service returns no username, so the route
    // falls back to the client hint / session name. Per-test overrides simulate
    // a successful server-side resolution.
    mockResolveUsernameByAddress.mockResolvedValue(null)
    mockVerifySiwe.mockResolvedValue({
      isValid: true,
      siweMessageData: { address: '0xWALLET' },
    })
  })

  it('returns 401 when there is no session', async () => {
    mockRequireSession.mockResolvedValueOnce({
      error: new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
      }),
    })

    const res = await POST(makeRequest({ payload: makePayload(), nonce: 'n', nullifier: '0xabc123' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when nullifier is missing', async () => {
    mockRequireSession.mockResolvedValueOnce({ session: SESSION })

    const res = await POST(makeRequest({ payload: makePayload(), nonce: 'n' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Nullifier mismatch')
  })

  it('returns 403 when nullifier does not match the session', async () => {
    mockRequireSession.mockResolvedValueOnce({ session: SESSION })

    const res = await POST(
      makeRequest({ payload: makePayload(), nonce: 'n', nullifier: '0xdifferent' })
    )
    expect(res.status).toBe(403)
  })

  it('returns 400 when the payload is not a successful wallet auth', async () => {
    mockRequireSession.mockResolvedValueOnce({ session: SESSION })

    const res = await POST(
      makeRequest({ payload: { status: 'error' }, nonce: 'n', nullifier: '0xabc123' })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid wallet auth payload')
  })

  it('returns 400 when the nonce was not issued', async () => {
    mockRequireSession.mockResolvedValueOnce({ session: SESSION })
    mockConsumeNonce.mockReturnValueOnce(false)

    const res = await POST(
      makeRequest({ payload: makePayload(), nonce: 'stale', nullifier: '0xabc123' })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid or expired nonce')
  })

  it('returns 401 when SIWE verification throws', async () => {
    mockRequireSession.mockResolvedValueOnce({ session: SESSION })
    mockVerifySiwe.mockRejectedValueOnce(new Error('Signature verification failed'))

    const res = await POST(
      makeRequest({ payload: makePayload(), nonce: 'n', nullifier: '0xabc123' })
    )
    expect(res.status).toBe(401)
  })

  it('returns 401 when SIWE verification reports invalid', async () => {
    mockRequireSession.mockResolvedValueOnce({ session: SESSION })
    mockVerifySiwe.mockResolvedValueOnce({ isValid: false, siweMessageData: {} })

    const res = await POST(
      makeRequest({ payload: makePayload(), nonce: 'n', nullifier: '0xabc123' })
    )
    expect(res.status).toBe(401)
  })

  it('upgrades the session username and wallet address on success', async () => {
    mockRequireSession.mockResolvedValueOnce({ session: SESSION })
    mockUpdateSessionWalletAuth.mockResolvedValueOnce({
      ...SESSION,
      username: 'alice',
      wallet_address: '0xWALLET',
    })

    const res = await POST(
      makeRequest({
        payload: makePayload(),
        nonce: 'n',
        nullifier: '0xabc123',
        username: 'alice',
      })
    )
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.username).toBe('alice')
    expect(body.data.walletAddress).toBe('0xWALLET')
    expect(body.data.nullifier).toBe('0xabc123')

    expect(mockVerifySiwe).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0xWALLET', status: 'success' }),
      'n',
      expect.any(String)
    )
    expect(mockResolveUsernameByAddress).toHaveBeenCalledWith('0xWALLET')
    expect(mockUpdateSessionWalletAuth).toHaveBeenCalledWith('0xabc123', 'alice', '0xWALLET')
    expect(mockUpdateSessionUsername).not.toHaveBeenCalled()
  })

  it('resolves the username server-side from the SIWE address and stores it', async () => {
    mockRequireSession.mockResolvedValueOnce({ session: SESSION })
    mockResolveUsernameByAddress.mockResolvedValueOnce('realname')
    mockUpdateSessionWalletAuth.mockResolvedValueOnce({
      ...SESSION,
      username: 'realname',
      wallet_address: '0xWALLET',
    })

    const res = await POST(
      makeRequest({ payload: makePayload(), nonce: 'n', nullifier: '0xabc123' })
    )
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.username).toBe('realname')
    expect(mockResolveUsernameByAddress).toHaveBeenCalledWith('0xWALLET')
    expect(mockUpdateSessionWalletAuth).toHaveBeenCalledWith('0xabc123', 'realname', '0xWALLET')
  })

  it('prefers the server-resolved username over the client hint', async () => {
    mockRequireSession.mockResolvedValueOnce({ session: SESSION })
    mockResolveUsernameByAddress.mockResolvedValueOnce('realname')
    mockUpdateSessionWalletAuth.mockResolvedValueOnce({
      ...SESSION,
      username: 'realname',
      wallet_address: '0xWALLET',
    })

    await POST(
      makeRequest({
        payload: makePayload(),
        nonce: 'n',
        nullifier: '0xabc123',
        username: 'clienthint',
      })
    )
    expect(mockUpdateSessionWalletAuth).toHaveBeenCalledWith('0xabc123', 'realname', '0xWALLET')
  })

  it('falls back to the client hint when the server resolver returns null', async () => {
    mockRequireSession.mockResolvedValueOnce({ session: SESSION })
    mockResolveUsernameByAddress.mockResolvedValueOnce(null)
    mockUpdateSessionWalletAuth.mockResolvedValueOnce({
      ...SESSION,
      username: 'clienthint',
      wallet_address: '0xWALLET',
    })

    await POST(
      makeRequest({
        payload: makePayload(),
        nonce: 'n',
        nullifier: '0xabc123',
        username: 'clienthint',
      })
    )
    expect(mockUpdateSessionWalletAuth).toHaveBeenCalledWith('0xabc123', 'clienthint', '0xWALLET')
  })

  it('keeps the fallback username when no username is provided', async () => {
    mockRequireSession.mockResolvedValueOnce({ session: SESSION })
    mockUpdateSessionWalletAuth.mockResolvedValueOnce({
      ...SESSION,
      username: SESSION.username,
      wallet_address: '0xWALLET',
    })

    const res = await POST(
      makeRequest({ payload: makePayload(), nonce: 'n', nullifier: '0xabc123' })
    )
    expect(res.status).toBe(200)
    // No username in body -> falls back to the existing session username.
    expect(mockUpdateSessionWalletAuth).toHaveBeenCalledWith(
      '0xabc123',
      'Human #abc123',
      '0xWALLET'
    )
  })

  it('falls back to username-only update when wallet_address column is missing', async () => {
    mockRequireSession.mockResolvedValueOnce({ session: SESSION })
    mockUpdateSessionWalletAuth.mockRejectedValueOnce(new Error('column "wallet_address" does not exist'))
    mockUpdateSessionUsername.mockResolvedValueOnce({ ...SESSION, username: 'alice' })

    const res = await POST(
      makeRequest({
        payload: makePayload(),
        nonce: 'n',
        nullifier: '0xabc123',
        username: 'alice',
      })
    )
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.username).toBe('alice')
    expect(body.data.walletAddress).toBe('0xWALLET')
    expect(mockUpdateSessionUsername).toHaveBeenCalledWith('0xabc123', 'alice')
  })
})
