/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { _resetEnvForTests } from '@/lib/env'

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

// The env module memoizes process.env at first access and validates every
// required var together, so tests must provide all required vars (not just the
// ones this route reads) and clear the cache between cases.
const REQUIRED_ENV = {
  NEXT_PUBLIC_APP_ID: 'app_test',
  RP_ID: 'rp_test',
  RP_SIGNING_KEY: 'signing_key_test',
  DEV_PORTAL_API_KEY: 'key_test',
  NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.test',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon_test',
  SUPABASE_SERVICE_ROLE_KEY: 'service_test',
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/payments/confirm', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/payments/confirm', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    jest.clearAllMocks()
    _resetEnvForTests()
    for (const [k, v] of Object.entries(REQUIRED_ENV)) {
      savedEnv[k] = process.env[k]
      process.env[k] = v
    }
    mockRequireSession.mockResolvedValue({ session: SESSION })
  })

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
    _resetEnvForTests()
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

  it('returns 400 when transaction failed on-chain', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reference: 'ref1', status: 'failed' }),
    })

    const res = await POST(makeRequest({
      payload: { transaction_id: 'tx1', reference: 'ref1', status: 'success' },
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Transaction not confirmed')
  })

  it('returns 400 when reference does not match', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reference: 'ref_other', status: 'completed' }),
    })

    const res = await POST(makeRequest({
      payload: { transaction_id: 'tx1', reference: 'ref1', status: 'success' },
    }))
    expect(res.status).toBe(400)
  })

  it('accepts a pending transaction (settlement takes time after the pay dialog)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reference: 'ref1', transaction_status: 'pending' }),
    })
    mockConsumeReference.mockResolvedValueOnce(true)

    const res = await POST(makeRequest({
      payload: { transaction_id: 'tx1', reference: 'ref1', status: 'success' },
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
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

  it('returns 500 with a clear missing-var message when env is not configured', async () => {
    // env validation names the specific missing var the route reads first.
    delete process.env.NEXT_PUBLIC_APP_ID
    _resetEnvForTests()

    const res = await POST(makeRequest({
      payload: { transaction_id: 'tx1', reference: 'ref1', status: 'success' },
    }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Missing env vars:/)
    expect(body.error).toContain('NEXT_PUBLIC_APP_ID')
  })
})
