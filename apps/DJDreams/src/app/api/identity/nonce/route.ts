import { NextRequest, NextResponse } from 'next/server'
import {
  issueNonce,
  NONCE_COOKIE_NAME,
  NONCE_MAX_AGE_SECONDS,
} from '@/lib/domains/identity/nonce-store'
import { getClientIp, identityRateLimiter } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Issue a single-use SIWE nonce for MiniKit Wallet Auth. The nonce is returned
 * to the client AND stored in an HMAC-signed httpOnly cookie; the client embeds
 * the nonce in MiniKit.walletAuth, and /api/identity/verify-wallet validates it
 * against the cookie. The cookie makes the nonce serverless-safe (no in-memory
 * state shared across instances).
 */
export async function POST(req: NextRequest) {
  try {
    const limit = identityRateLimiter.check(getClientIp(req.headers))
    if (!limit.allowed) {
      const retryAfter = Math.ceil(limit.retryAfterMs / 1000)
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { RetryAfter: String(retryAfter) } }
      )
    }

    const { nonce, cookieValue } = issueNonce()
    const res = NextResponse.json({ nonce })
    res.cookies.set(NONCE_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: NONCE_MAX_AGE_SECONDS,
    })
    return res
  } catch (error) {
    console.error('Nonce issue error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
