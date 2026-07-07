import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/domains/identity/session'
import { setSessionCookie } from '@/lib/domains/identity/auth'
import { resolveDisplayName } from '@/lib/domains/identity/username'
import { env, MissingEnvError } from '@/lib/env'
import { getClientIp, identityRateLimiter } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

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

    const body = await req.json()
    const { proof, username } = body

    if (!proof) {
      return NextResponse.json({ error: 'Missing proof payload' }, { status: 400 })
    }

    const rpId = env.rpId()

    const verifyRes = await fetch(
      `https://developer.world.org/api/v4/verify/${rpId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proof),
      }
    )

    const verifyData = await verifyRes.json()

    if (!verifyRes.ok || !verifyData.success) {
      console.error('World ID v4 verification failed:', verifyData)
      return NextResponse.json(
        { error: 'Verification failed', detail: verifyData.detail || verifyData.code },
        { status: 400 }
      )
    }

    const nullifier = verifyData.nullifier || verifyData.results?.[0]?.nullifier
    if (!nullifier) {
      return NextResponse.json({ error: 'No nullifier in verification response' }, { status: 500 })
    }

    const displayName = resolveDisplayName(nullifier, username)
    const session = await createSession(nullifier, displayName)

    const response = NextResponse.json({
      data: { nullifier: session.nullifier, username: session.username },
    })

    setSessionCookie(response, session.session_token)

    return response
  } catch (error) {
    console.error('World ID v4 verification error:', error)
    // Surface a clear message for misconfig (consistent with /api/identity/rp-context);
    // keep other failures generic to avoid leaking internal detail.
    const message = error instanceof MissingEnvError ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
