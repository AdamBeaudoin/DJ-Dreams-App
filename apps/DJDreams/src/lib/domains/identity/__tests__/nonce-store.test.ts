/**
 * @jest-environment node
 */
import { issueNonce, consumeNonce } from '../nonce-store'
import { _resetEnvForTests } from '@/lib/env'

// The nonce store derives its HMAC key from RP_SIGNING_KEY via env.ts.
process.env.RP_SIGNING_KEY = 'test-rp-signing-key'

describe('nonce-store', () => {
  beforeEach(() => {
    _resetEnvForTests()
    jest.clearAllMocks()
  })

  describe('issueNonce', () => {
    it('returns an alphanumeric nonce with no hyphens and >= 8 chars', () => {
      const { nonce } = issueNonce()
      expect(typeof nonce).toBe('string')
      expect(nonce.length).toBeGreaterThanOrEqual(8)
      expect(nonce).toMatch(/^[0-9a-zA-Z]+$/)
      expect(nonce).not.toContain('-')
    })

    it('returns a cookie value of the form nonce:expiresAt:hmac', () => {
      const { nonce, expiresAt, cookieValue } = issueNonce()
      const parts = cookieValue.split(':')
      expect(parts).toHaveLength(3)
      expect(parts[0]).toBe(nonce)
      expect(Number(parts[1])).toBe(expiresAt)
      expect(parts[2]).toMatch(/^[0-9a-f]+$/)
    })

    it('issues distinct nonces', () => {
      const a = issueNonce()
      const b = issueNonce()
      expect(a.nonce).not.toBe(b.nonce)
      expect(a.cookieValue).not.toBe(b.cookieValue)
    })
  })

  describe('consumeNonce', () => {
    it('accepts a freshly issued nonce once (single-use via cookie clear)', () => {
      const { nonce, cookieValue } = issueNonce()
      expect(consumeNonce(cookieValue, nonce)).toBe(true)
      // The cookie itself is still technically valid until the caller clears it;
      // single-use is enforced by the route clearing the cookie. Re-consuming the
      // SAME cookie+nonce would pass here, which is why the route always clears.
      // This test documents that the store validates, the route enforces single-use.
    })

    it('rejects when the body nonce does not match the cookie nonce', () => {
      const { cookieValue } = issueNonce()
      expect(consumeNonce(cookieValue, 'a-different-nonce-12345')).toBe(false)
    })

    it('rejects an expired nonce', () => {
      jest.useFakeTimers()
      try {
        const { nonce, cookieValue } = issueNonce()
        // NONCE_TTL_MS is 5 minutes; step just past it
        jest.advanceTimersByTime(5 * 60 * 1000 + 1000)
        expect(consumeNonce(cookieValue, nonce)).toBe(false)
      } finally {
        jest.useRealTimers()
      }
    })

    it('rejects a tampered cookie (wrong hmac)', () => {
      const { nonce, cookieValue } = issueNonce()
      const tampered = cookieValue.slice(0, -2) + 'ff'
      expect(consumeNonce(tampered, nonce)).toBe(false)
    })

    it('rejects a cookie signed with a different secret', () => {
      const { nonce, cookieValue } = issueNonce()
      // Re-sign with the wrong key by swapping the RP signing key after issue.
      _resetEnvForTests()
      process.env.RP_SIGNING_KEY = 'a-completely-different-key'
      expect(consumeNonce(cookieValue, nonce)).toBe(false)
    })

    it('rejects malformed cookie values', () => {
      const { nonce } = issueNonce()
      expect(consumeNonce('not-enough-parts', nonce)).toBe(false)
      expect(consumeNonce('', nonce)).toBe(false)
      expect(consumeNonce('a:b:c:d', nonce)).toBe(false)
    })

    it('rejects non-string values', () => {
      const { nonce, cookieValue } = issueNonce()
      expect(consumeNonce(undefined, nonce)).toBe(false)
      expect(consumeNonce(null, nonce)).toBe(false)
      expect(consumeNonce(123, nonce)).toBe(false)
      expect(consumeNonce(cookieValue, undefined)).toBe(false)
      expect(consumeNonce(cookieValue, '')).toBe(false)
    })
  })
})
