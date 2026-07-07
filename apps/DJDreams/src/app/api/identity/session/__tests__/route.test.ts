/**
 * @jest-environment node
 */
const mockRequireSession = jest.fn()

jest.mock('@/lib/domains/identity/auth', () => ({
  requireSession: () => mockRequireSession(),
}))

import { GET } from '../route'

describe('GET /api/identity/session', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when there is no session', async () => {
    mockRequireSession.mockResolvedValueOnce({
      error: new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 }),
    })

    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns the server-authoritative nullifier and username', async () => {
    mockRequireSession.mockResolvedValueOnce({
      session: {
        nullifier: '0xabc123',
        username: 'alice',
        session_token: 'tok_abc',
        created_at: '2025-01-01',
        last_seen_at: '2025-01-01',
      },
    })

    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.nullifier).toBe('0xabc123')
    expect(body.data.username).toBe('alice')
    // Never expose the session token to the client.
    expect(body.data.session_token).toBeUndefined()
  })

  it('returns the fallback username when walletAuth has not run', async () => {
    mockRequireSession.mockResolvedValueOnce({
      session: {
        nullifier: '0xabc123',
        username: 'Human #abc123',
        session_token: 'tok_abc',
        created_at: '2025-01-01',
        last_seen_at: '2025-01-01',
      },
    })

    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.username).toBe('Human #abc123')
  })
})
