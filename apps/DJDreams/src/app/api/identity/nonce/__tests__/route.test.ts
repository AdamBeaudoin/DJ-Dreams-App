/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { NONCE_COOKIE_NAME } from '@/lib/domains/identity/nonce-store'
import { _resetEnvForTests } from '@/lib/env'
import { identityRateLimiter } from '@/lib/rate-limit'

import { POST } from '../route'

process.env.RP_SIGNING_KEY = 'test-rp-signing-key'

function makeRequest(ip?: string) {
  return new NextRequest('http://localhost/api/identity/nonce', {
    method: 'POST',
    headers: ip ? { 'x-forwarded-for': ip } : undefined,
  })
}

describe('POST /api/identity/nonce', () => {
  beforeEach(() => {
    _resetEnvForTests()
    identityRateLimiter.reset()
  })

  it('returns a valid nonce', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(typeof body.nonce).toBe('string')
    expect(body.nonce.length).toBeGreaterThanOrEqual(8)
    expect(body.nonce).toMatch(/^[0-9a-zA-Z]+$/)
    expect(body.nonce).not.toContain('-')
  })

  it('sets an HMAC-signed httpOnly cookie carrying the nonce', async () => {
    const res = await POST(makeRequest())
    const body = await res.json()
    const setCookie = res.cookies.get(NONCE_COOKIE_NAME)

    expect(setCookie).toBeDefined()
    expect(setCookie?.httpOnly).toBe(true)
    expect(setCookie?.sameSite).toBe('lax')
    // The cookie value embeds the nonce as its first segment.
    expect(setCookie?.value.startsWith(`${body.nonce}:`)).toBe(true)
  })

  it('issues different nonces across calls (distinct IPs)', async () => {
    const a = await (await POST(makeRequest('1.1.1.1'))).json()
    const b = await (await POST(makeRequest('2.2.2.2'))).json()
    expect(a.nonce).not.toBe(b.nonce)
  })

  it('rate-limits repeated nonce requests from the same IP', async () => {
    const first = await POST(makeRequest('3.3.3.3'))
    expect(first.status).toBe(200)

    const second = await POST(makeRequest('3.3.3.3'))
    expect(second.status).toBe(429)
    expect(second.headers.get('RetryAfter')).toBeTruthy()
  })
})
