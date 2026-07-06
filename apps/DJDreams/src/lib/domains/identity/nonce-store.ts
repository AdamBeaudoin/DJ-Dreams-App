import { randomBytes } from 'crypto'

/**
 * In-memory store for SIWE nonces issued by /api/identity/nonce.
 *
 * /api/identity/verify-wallet consumes a nonce to prove it was issued by us
 * (and hasn't been replayed). Nonces are single-use and expire after NONCE_TTL_MS.
 *
 * Note: this is process-local state. On serverless platforms each instance has
 * its own map; in practice walletAuth completes within seconds of nonce issuance
 * on the same warm instance, and a missed consume simply expires. For stricter
 * guarantees move this to a cookie-bound HMAC or a DB row.
 */
const NONCE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const issuedNonces = new Map<string, number>() // nonce -> expiresAt (ms epoch)

function generateNonce(): string {
  // 16 random bytes -> 32 hex chars. Alphanumeric, no hyphens (UUIDs stripped of
  // hyphens would yield the same form). SIWE nonces must not contain hyphens.
  return randomBytes(16).toString('hex')
}

function pruneExpired(now: number): void {
  for (const [nonce, expiresAt] of issuedNonces) {
    if (expiresAt <= now) issuedNonces.delete(nonce)
  }
}

export function issueNonce(): string {
  const now = Date.now()
  pruneExpired(now)
  const nonce = generateNonce()
  issuedNonces.set(nonce, now + NONCE_TTL_MS)
  return nonce
}

/**
 * Validate and burn a nonce. Returns true only if the nonce was previously issued,
 * has not expired, and has not already been consumed (single-use). Acts as a type
 * guard so callers can use `nonce` as a string after a successful consume.
 */
export function consumeNonce(nonce: unknown): nonce is string {
  if (typeof nonce !== 'string' || nonce.length === 0) return false

  const now = Date.now()
  pruneExpired(now)

  const expiresAt = issuedNonces.get(nonce)
  if (!expiresAt) return false

  issuedNonces.delete(nonce) // single-use: burn regardless of outcome
  return expiresAt > now
}

/** Test-only: clear the store between tests. */
export function __clearNonces(): void {
  issuedNonces.clear()
}
