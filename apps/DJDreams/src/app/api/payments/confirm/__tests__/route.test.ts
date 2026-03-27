/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockRequireSession = jest.fn()
const mockConsumeReference = jest.fn()

jest.mock('@/lib/domains/identity/auth', () => ({
  requireSession: () => mockRequireSession(),
}))

jest.mock('@/lib/domains/payments/repository', () => ({
  consumeReference: (...args: unknown[]) => mockConsumeReference(...args),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import { POST } from '../route'

const SESSION = {
  nullifier: '0xabc',
  username: 'TestUser',
  created_at: '2025-01-01',
  last_seen_at: '2025-01-01',
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/payments/confirm', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/payments/confirm', () => {
  let savedAppId: string | undefined
  let savedApiKey: string | undefined

  beforeEach(() => {
    jest.clearAllMocks()
    savedAppId = process.env.APP_ID
    savedApiKey = process.env.DEV_PORTAL_API_KEY
    process.env.APP_ID = 'app_test'
    process.env.DEV_PORTAL_API_KEY = 'key_test'
    mockRequireSession.mockResolvedValue({ session: SESSION })
  })

  afterEach(() => {
    process.env.APP_ID = savedAppId
    process.env.DEV_PORTAL_API_KEY = savedApiKey
  })

  it('returns 401 when session cookie is missing', async () => {
    const errorResponse = { status: 401, json: async () => ({ error: 'Authentication required' }) }
    mockRequireSession.mockResolvedValueOnce({ error: errorResponse })

    const res = await POST(makeRequest({ payload: {} }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when payload is invalid', async () => {
    const res = await POST(makeRequest({ payload: {} }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid payload')
  })

  it('returns 502 when Developer Portal is unreachable', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })

    const res = await POST(makeRequest({
      payload: { transaction_id: 'tx1', reference: 'ref1', status: 'success' },
    }))
    expect(res.status).toBe(502)
  })

  it('returns 400 when transaction is not confirmed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reference: 'ref1', status: 'pending' }),
    })

    const res = await POST(makeRequest({
      payload: { transaction_id: 'tx1', reference: 'ref1', status: 'success' },
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Transaction not confirmed')
  })

  it('returns 409 when reference is already consumed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reference: 'ref1', status: 'completed' }),
    })
    mockConsumeReference.mockResolvedValueOnce(false)

    const res = await POST(makeRequest({
      payload: { transaction_id: 'tx1', reference: 'ref1', status: 'success' },
    }))
    expect(res.status).toBe(409)
  })

  it('returns success when payment is valid', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reference: 'ref1', status: 'completed' }),
    })
    mockConsumeReference.mockResolvedValueOnce(true)

    const res = await POST(makeRequest({
      payload: { transaction_id: 'tx1', reference: 'ref1', status: 'success' },
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    expect(mockConsumeReference).toHaveBeenCalledWith('ref1', '0xabc', 'tx1')
  })
})
