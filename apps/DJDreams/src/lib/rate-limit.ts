/**
 * In-memory per-key rate limiter.
 *
 * Two limits are enforced per key (e.g. World ID nullifier):
 *   1. A minimum interval between successive actions (cooldown).
 *   2. A maximum number of actions within a sliding window.
 *
 * Entries are pruned lazily on access: timestamps older than the window are
 * dropped, and keys with no remaining timestamps are removed from the map so
 * memory does not grow unbounded.
 */

export interface RateLimitConfig {
  /** Minimum time between two consecutive actions, in milliseconds. */
  minIntervalMs: number
  /** Sliding window length, in milliseconds. */
  windowMs: number
  /** Maximum actions allowed within the sliding window. */
  windowMax: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Milliseconds the caller should wait before retrying when denied. */
  retryAfterMs: number
  /** Reason for denial, surfaced to callers for error messaging. */
  reason?: 'too-frequent' | 'too-many'
}

const DEFAULT_CONFIG: RateLimitConfig = {
  minIntervalMs: 2_000, // 1 message per 2 seconds
  windowMs: 10_000, // 10 second sliding window
  windowMax: 5, // max 5 messages per 10 seconds
}

export class RateLimiter {
  private readonly hits = new Map<string, number[]>()
  private readonly config: RateLimitConfig

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Records an attempt for `key` and returns whether it is allowed.
   * Mutates state only when the attempt is allowed.
   */
  check(key: string, now: number = Date.now()): RateLimitResult {
    const { minIntervalMs, windowMs, windowMax } = this.config
    const windowStart = now - windowMs

    const recent = this.prune(key, windowStart)

    if (recent.length > 0) {
      const last = recent[recent.length - 1]
      const elapsed = now - last
      if (elapsed < minIntervalMs) {
        return {
          allowed: false,
          retryAfterMs: minIntervalMs - elapsed,
          reason: 'too-frequent',
        }
      }
    }

    if (recent.length >= windowMax) {
      const oldest = recent[0]
      return {
        allowed: false,
        retryAfterMs: Math.max(1, windowMs - (now - oldest)),
        reason: 'too-many',
      }
    }

    recent.push(now)
    this.hits.set(key, recent)
    return { allowed: true, retryAfterMs: 0 }
  }

  /** Drops timestamps older than `windowStart` for `key` and returns the rest. */
  private prune(key: string, windowStart: number): number[] {
    const existing = this.hits.get(key)
    if (!existing || existing.length === 0) {
      this.hits.delete(key)
      return []
    }
    const kept = existing.filter(ts => ts > windowStart)
    if (kept.length === 0) {
      this.hits.delete(key)
    } else {
      this.hits.set(key, kept)
    }
    return kept
  }

  /** Removes expired keys. Useful for tests and explicit sweeps. */
  cleanup(now: number = Date.now()): void {
    const windowStart = now - this.config.windowMs
    for (const key of [...this.hits.keys()]) {
      this.prune(key, windowStart)
    }
  }

  /** Clears all state for `key` (or everything when omitted). For tests. */
  reset(key?: string): void {
    if (key === undefined) {
      this.hits.clear()
    } else {
      this.hits.delete(key)
    }
  }
}

/** Shared limiter instance for the chat send endpoint, keyed by nullifier. */
export const chatSendRateLimiter = new RateLimiter()
