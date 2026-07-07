import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { env } from '@/lib/env'

/**
 * Serverless-safe SIWE nonce store for MiniKit Wallet Auth.
 *
 * /api/identity/nonce issues a nonce and hands it to the client; the client
 * embeds it in the signed SIWE message via MiniKit.walletAuth, then
 * /api/identity/verify-wallet confirms the nonce was issued by us and not
 * replayed.
 *
 * Implementation: instead of a process-local Map (which fails across serverless
 * instances — the nonce is issued on one instance and consumed on another), the
 * nonce is returned to the client AND stored in an HMAC-signed httpOnly cookie.
 * The cookie is stateless and travels with the verify-wallet request (same
 * origin), so it works on any instance. The HMAC proves the cookie was minted by
 * us; the embedded expiry makes it self-invalidating; clearing the cookie on
 * consume makes it single-use.
 *
 * The HMAC key is derived (domain-separated) from the RP signing key — a
 * server-only secret the identity flow already requires — so no new env var is
 * needed.
 */
const NONCE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const HMAC_KEY_LABEL = 'dj-dreams-siwe-nonce-hmac-v1'

export const NONCE_COOKIE_NAME = 'siwe_nonce'
export const NONCE_MAX_AGE_SECONDS = Math.ceil(NONCE_TTL_MS / 1000)

export interface IssuedNonce {
  /** The nonce string to return to the client and embed in the SIWE message. */
  nonce: string
  /** Epoch ms when this nonce expires. */
  expiresAt: number
  /** The full HMAC-signed value to store in the httpOnly cookie. */
  cookieValue: string
}

function nonceHmacKey(): Buffer {
  return createHmac('sha256', env.rpSigningKey()).update(HMAC_KEY_LABEL).digest()
}

function sign(nonce: string, expiresAt: number): string {
  return createHmac('sha256', nonceHmacKey()).update(`${nonce}:${expiresAt}`).digest('hex')
}

function generateNonce(): string {
  // 16 random bytes -> 32 hex chars. Alphanumeric, no hyphens (SIWE nonces
  // must not contain hyphens per MiniKit v2 validation).
  return randomBytes(16).toString('hex')
}

export function issueNonce(): IssuedNonce {
  const nonce = generateNonce()
  const expiresAt = Date.now() + NONCE_TTL_MS
  const cookieValue = `${nonce}:${expiresAt}:${sign(nonce, expiresAt)}`
  return { nonce, expiresAt, cookieValue }
}

/**
 * Validate the nonce presented in the request body against the HMAC-signed
 * cookie value. Returns true only if the cookie's HMAC is valid, the cookie's
 * nonce matches the body nonce, and it has not expired. Acts as a type guard so
 * callers can use `nonce` as a string after a successful consume.
 *
 * Single-use is enforced by the caller clearing the cookie after consume,
 * regardless of outcome — so a failed SIWE check still burns the nonce.
 */
export function consumeNonce(cookieValue: unknown, nonce: unknown): nonce is string {
  if (typeof cookieValue !== 'string' || typeof nonce !== 'string' || nonce.length === 0) {
    return false
  }

  const parts = cookieValue.split(':')
  if (parts.length !== 3) return false
  const [cookieNonce, expiresAtStr, cookieMac] = parts

  const expiresAt = Number(expiresAtStr)
  if (!Number.isFinite(expiresAt)) return false

  const expectedMac = sign(cookieNonce, expiresAt)
  const macBuf = Buffer.from(cookieMac)
  const expectedBuf = Buffer.from(expectedMac)
  if (macBuf.length !== expectedBuf.length || !timingSafeEqual(macBuf, expectedBuf)) {
    return false
  }

  // The nonce in the signed SIWE message (body) must match the nonce we issued
  // (cookie) — prevents presenting a valid cookie for a different nonce.
  if (cookieNonce !== nonce) return false

  return expiresAt > Date.now()
}
