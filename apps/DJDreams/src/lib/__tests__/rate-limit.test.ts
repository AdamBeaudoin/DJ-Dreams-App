/**
 * @jest-environment node
 */
import { RateLimiter } from '../rate-limit'

describe('RateLimiter', () => {
  let limiter: RateLimiter
  const config = { minIntervalMs: 2000, windowMs: 10000, windowMax: 5 }

  beforeEach(() => {
    limiter = new RateLimiter(config)
  })

  describe('cooldown (min interval)', () => {
    it('allows the first action', () => {
      const r = limiter.check('user1', 0)
      expect(r.allowed).toBe(true)
      expect(r.retryAfterMs).toBe(0)
    })

    it('blocks a second action within the cooldown', () => {
      limiter.check('user1', 0)
      const r = limiter.check('user1', 1000)
      expect(r.allowed).toBe(false)
      expect(r.reason).toBe('too-frequent')
      expect(r.retryAfterMs).toBe(1000) // 2000 - 1000
    })

    it('allows a second action exactly at the cooldown boundary', () => {
      limiter.check('user1', 0)
      const r = limiter.check('user1', 2000)
      expect(r.allowed).toBe(true)
    })
  })

  describe('window cap', () => {
    // With a 2s cooldown and 10s window, 5 messages land exactly at the window
    // boundary, so the cooldown is the binding constraint. Use a tighter cooldown
    // to make the window cap reachable in isolation.
    const capLimiter = new RateLimiter({ minIntervalMs: 1000, windowMs: 10000, windowMax: 5 })

    beforeEach(() => {
      capLimiter.reset()
    })

    it('blocks the 6th action within the window', () => {
      for (let i = 0; i < 5; i++) {
        const r = capLimiter.check('user1', i * 1000) // 0,1,2,3,4s
        expect(r.allowed).toBe(true)
      }
      const blocked = capLimiter.check('user1', 5000) // still within 10s window
      expect(blocked.allowed).toBe(false)
      expect(blocked.reason).toBe('too-many')
      expect(blocked.retryAfterMs).toBeGreaterThan(0)
    })

    it('allows again after the oldest timestamp falls out of the window', () => {
      for (let i = 0; i < 5; i++) capLimiter.check('user1', i * 1000)
      // t=10001: timestamp at 0 pruned (0 <= 10001-10000=1), opening a slot
      const r = capLimiter.check('user1', 10001)
      expect(r.allowed).toBe(true)
    })
  })

  describe('per-key isolation', () => {
    it('tracks keys independently', () => {
      limiter.check('user1', 0)
      const r = limiter.check('user2', 500)
      expect(r.allowed).toBe(true)
    })
  })

  describe('cleanup / memory', () => {
    it('drops keys once all timestamps age out', () => {
      limiter.check('user1', 0)
      limiter.cleanup(20000) // well past the window
      // A fresh check after cleanup should be allowed as the first action
      const r = limiter.check('user1', 20000)
      expect(r.allowed).toBe(true)
    })

    it('reset clears a specific key', () => {
      limiter.check('user1', 0)
      limiter.reset('user1')
      const r = limiter.check('user1', 100)
      expect(r.allowed).toBe(true)
    })
  })

  describe('defaults', () => {
    it('uses the documented chat limits by default', () => {
      const def = new RateLimiter()
      // 1 per 2s: second within window blocked (cooldown is the binding limit)
      def.check('u', 0)
      expect(def.check('u', 500).allowed).toBe(false)
      // 2s boundary allowed
      expect(def.check('u', 2000).allowed).toBe(true)
    })
  })
})
