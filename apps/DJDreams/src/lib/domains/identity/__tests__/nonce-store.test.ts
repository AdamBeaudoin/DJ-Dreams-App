/**
 * @jest-environment node
 */
import { issueNonce, consumeNonce, __clearNonces } from '../nonce-store'

describe('nonce-store', () => {
  beforeEach(() => {
    __clearNonces()
    jest.clearAllMocks()
  })

  describe('issueNonce', () => {
    it('returns an alphanumeric nonce with no hyphens and >= 8 chars', () => {
      const nonce = issueNonce()
      expect(typeof nonce).toBe('string')
      expect(nonce.length).toBeGreaterThanOrEqual(8)
      expect(nonce).toMatch(/^[0-9a-zA-Z]+$/)
      expect(nonce).not.toContain('-')
    })

    it('issues distinct nonces', () => {
      const a = issueNonce()
      const b = issueNonce()
      expect(a).not.toBe(b)
    })
  })

  describe('consumeNonce', () => {
    it('accepts a freshly issued nonce once (single-use)', () => {
      const nonce = issueNonce()
      expect(consumeNonce(nonce)).toBe(true)
      expect(consumeNonce(nonce)).toBe(false) // burned after first consume
    })

    it('rejects unknown nonces', () => {
      expect(consumeNonce('never-issued-1234567890')).toBe(false)
    })

    it('rejects non-string values', () => {
      expect(consumeNonce(undefined)).toBe(false)
      expect(consumeNonce(null)).toBe(false)
      expect(consumeNonce(123)).toBe(false)
      expect(consumeNonce('')).toBe(false)
    })

    it('rejects an expired nonce', () => {
      jest.useFakeTimers()
      try {
        const nonce = issueNonce()
        // NONCE_TTL_MS is 5 minutes; step just past it
        jest.advanceTimersByTime(5 * 60 * 1000 + 1000)
        expect(consumeNonce(nonce)).toBe(false)
      } finally {
        jest.useRealTimers()
      }
    })
  })
})
