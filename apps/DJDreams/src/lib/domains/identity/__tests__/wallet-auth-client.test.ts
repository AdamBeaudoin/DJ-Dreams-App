/**
 * @jest-environment jsdom
 */
import { upgradeSessionWithWalletAuth } from '../wallet-auth-client'

const mockIsInstalled = jest.fn()
const mockWalletAuth = jest.fn()
const mockGetUserByAddress = jest.fn()
const mockUser: { username?: string; walletAddress?: string } = {}

jest.mock('@worldcoin/minikit-js', () => ({
  MiniKit: {
    isInstalled: () => mockIsInstalled(),
    commandsAsync: { walletAuth: (...args: unknown[]) => mockWalletAuth(...args) },
    getUserByAddress: (...args: unknown[]) => mockGetUserByAddress(...args),
    // `user` is read lazily (getter) so the hoisted jest.mock factory does not
    // touch `mockUser` before its `const` initializes.
    get user() {
      return mockUser
    },
  },
}))

const fetchMock = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = fetchMock as unknown as typeof fetch
  mockIsInstalled.mockReturnValue(true)
  mockUser.username = undefined
  mockUser.walletAddress = undefined
  // Default: getUserByAddress returns no username; tests override to simulate
  // a successful client-side resolution.
  mockGetUserByAddress.mockResolvedValue({ walletAddress: '0xWALLET' })
  fetchMock.mockImplementation(async (url: string) => {
    if (typeof url === 'string' && url.includes('/api/identity/nonce')) {
      return { ok: true, json: async () => ({ nonce: 'testnonce123456' }) } as Response
    }
    if (typeof url === 'string' && url.includes('/api/identity/verify-wallet')) {
      return {
        ok: true,
        json: async () => ({ data: { username: 'alice', walletAddress: '0xWALLET' } }),
      } as Response
    }
    return { ok: false, json: async () => ({ error: 'not found' }) } as Response
  })
})

function successPayload() {
  return { status: 'success', message: 'msg', signature: '0x', address: '0xWALLET' }
}

describe('upgradeSessionWithWalletAuth', () => {
  it('returns unavailable when MiniKit is not installed', async () => {
    mockIsInstalled.mockReturnValue(false)
    const result = await upgradeSessionWithWalletAuth('0xabc123')
    expect(result.status).toBe('unavailable')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns error when the nonce request fails', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/api/identity/nonce')) {
        return { ok: false, json: async () => ({ error: 'boom' }) } as Response
      }
      return { ok: false, json: async () => ({}) } as Response
    })
    const result = await upgradeSessionWithWalletAuth('0xabc123')
    expect(result.status).toBe('error')
  })

  it('returns error when the nonce request throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'))
    const result = await upgradeSessionWithWalletAuth('0xabc123')
    expect(result.status).toBe('error')
  })

  it('returns rejected when the user dismisses the wallet prompt', async () => {
    mockWalletAuth.mockResolvedValueOnce({ finalPayload: { status: 'rejection' } })
    const result = await upgradeSessionWithWalletAuth('0xabc123')
    expect(result.status).toBe('rejected')
  })

  it('returns error when the wallet prompt throws', async () => {
    mockWalletAuth.mockRejectedValueOnce(new Error('prompt failed'))
    const result = await upgradeSessionWithWalletAuth('0xabc123')
    expect(result.status).toBe('error')
  })

  it('returns error when the server rejects the SIWE proof', async () => {
    mockWalletAuth.mockResolvedValueOnce({ finalPayload: successPayload() })
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/api/identity/nonce')) {
        return { ok: true, json: async () => ({ nonce: 'testnonce123456' }) } as Response
      }
      return { ok: false, json: async () => ({ error: 'Invalid nonce' }) } as Response
    })
    const result = await upgradeSessionWithWalletAuth('0xabc123')
    expect(result.status).toBe('error')
  })

  it('returns ok with username + walletAddress on a successful upgrade', async () => {
    mockWalletAuth.mockResolvedValueOnce({ finalPayload: successPayload() })
    mockGetUserByAddress.mockResolvedValueOnce({ username: 'alice', walletAddress: '0xWALLET' })

    const result = await upgradeSessionWithWalletAuth('0xabc123')
    expect(result.status).toBe('ok')
    expect(result.username).toBe('alice')
    expect(result.walletAddress).toBe('0xWALLET')

    // The username is resolved from the SIWE payload address via getUserByAddress.
    expect(mockGetUserByAddress).toHaveBeenCalledWith('0xWALLET')

    // The verify-wallet call carries the nonce, nullifier, and resolved username.
    const verifyCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes('/api/identity/verify-wallet')
    )
    expect(verifyCall).toBeDefined()
    const body = JSON.parse(verifyCall![1].body)
    expect(body.nonce).toBe('testnonce123456')
    expect(body.nullifier).toBe('0xabc123')
    expect(body.username).toBe('alice')
  })

  it('uses MiniKit.user.username as a fast path when present', async () => {
    mockWalletAuth.mockResolvedValueOnce({ finalPayload: successPayload() })
    mockUser.username = 'cachedname'

    await upgradeSessionWithWalletAuth('0xabc123')

    // getUserByAddress is not called because the cached username was used.
    expect(mockGetUserByAddress).not.toHaveBeenCalled()
    const verifyCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes('/api/identity/verify-wallet')
    )
    const body = JSON.parse(verifyCall![1].body)
    expect(body.username).toBe('cachedname')
  })

  it('falls back to getUserByAddress when MiniKit.user.username is unset', async () => {
    mockWalletAuth.mockResolvedValueOnce({ finalPayload: successPayload() })
    mockGetUserByAddress.mockResolvedValueOnce({ username: 'fromaddress', walletAddress: '0xWALLET' })

    await upgradeSessionWithWalletAuth('0xabc123')

    expect(mockGetUserByAddress).toHaveBeenCalledWith('0xWALLET')
    const verifyCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes('/api/identity/verify-wallet')
    )
    const body = JSON.parse(verifyCall![1].body)
    expect(body.username).toBe('fromaddress')
  })

  it('returns ok without a username when neither the SDK nor server had one', async () => {
    mockWalletAuth.mockResolvedValueOnce({ finalPayload: successPayload() })
    // getUserByAddress returns no username; server has none either.
    mockGetUserByAddress.mockResolvedValueOnce({ walletAddress: '0xWALLET' })
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/api/identity/nonce')) {
        return { ok: true, json: async () => ({ nonce: 'testnonce123456' }) } as Response
      }
      return { ok: true, json: async () => ({ data: { walletAddress: '0xWALLET' } }) } as Response
    })

    const result = await upgradeSessionWithWalletAuth('0xabc123')
    expect(result.status).toBe('ok')
    expect(result.username).toBeUndefined()
    expect(result.walletAddress).toBe('0xWALLET')
    // The verify-wallet body should omit username when none was resolved.
    const verifyCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes('/api/identity/verify-wallet')
    )
    const body = JSON.parse(verifyCall![1].body)
    expect(body.username).toBeUndefined()
  })
})
