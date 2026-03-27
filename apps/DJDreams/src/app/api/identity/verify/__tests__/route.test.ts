/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// Mock domain modules
const mockCreateSession = jest.fn()
const mockSetSessionCookie = jest.fn()

jest.mock('@/lib/domains/identity/session', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
}))

jest.mock('@/lib/domains/identity/auth', () => ({
  setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args),
}))

// Mock global fetch for World ID verification
const mockFetch = jest.fn()
global.fetch = mockFetch

import { POST } from '../route'

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/identity/verify', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/identity/verify', () => {
  let savedRpId: string | undefined
  let savedAppId: string | undefined

  beforeEach(() => {
    jest.clearAllMocks()
    savedRpId = process.env.RP_ID
    savedAppId = process.env.NEXT_PUBLIC_APP_ID
    process.env.RP_ID = 'test-rp-id'
  })

  afterEach(() => {
    process.env.RP_ID = savedRpId
    process.env.NEXT_PUBLIC_APP_ID = savedAppId
  })

  it('returns 400 when proof is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Missing proof payload')
  })

  it('returns 400 when World ID verification fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, code: 'invalid_proof' }),
    })

    const res = await POST(makeRequest({ proof: { merkle_root: '0x1' } }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Verification failed')
  })

  it('creates session and sets cookie on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, nullifier: '0xabc123' }),
    })
    mockCreateSession.mockResolvedValueOnce({
      nullifier: '0xabc123',
      username: 'TestUser',
      created_at: '2025-01-01',
      last_seen_at: '2025-01-01',
    })

    const res = await POST(makeRequest({ proof: { merkle_root: '0x1' }, username: 'TestUser' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.nullifier).toBe('0xabc123')
    expect(body.data.username).toBe('TestUser')

    expect(mockCreateSession).toHaveBeenCalledWith('0xabc123', 'TestUser')
    expect(mockSetSessionCookie).toHaveBeenCalledWith(expect.anything(), '0xabc123')
  })

  it('generates default username from nullifier when not provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, nullifier: '0xdef456' }),
    })
    mockCreateSession.mockResolvedValueOnce({
      nullifier: '0xdef456',
      username: 'Human #ef456',
      created_at: '2025-01-01',
      last_seen_at: '2025-01-01',
    })

    const res = await POST(makeRequest({ proof: { merkle_root: '0x1' } }))
    expect(res.status).toBe(200)
    expect(mockCreateSession).toHaveBeenCalledWith('0xdef456', 'Human #def456')
  })

  it('returns 500 when RP_ID is not configured', async () => {
    process.env.RP_ID = ''
    process.env.NEXT_PUBLIC_APP_ID = ''

    const res = await POST(makeRequest({ proof: { merkle_root: '0x1' } }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('RP_ID not configured')
  })
})
