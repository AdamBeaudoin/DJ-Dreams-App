import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/domains/identity/session'
import { setSessionCookie } from '@/lib/domains/identity/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { proof, username } = body

    if (!proof) {
      return NextResponse.json({ error: 'Missing proof payload' }, { status: 400 })
    }

    const rpId = process.env.RP_ID || process.env.NEXT_PUBLIC_APP_ID
    if (!rpId) {
      console.error('World ID verification failed: RP_ID not configured')
      return NextResponse.json({ error: 'RP_ID not configured' }, { status: 500 })
    }

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

    const displayName = username || `Human #${nullifier.slice(-6)}`
    const session = await createSession(nullifier, displayName)

    const response = NextResponse.json({
      data: { nullifier: session.nullifier, username: session.username },
    })

    setSessionCookie(response, session.nullifier)

    return response
  } catch (error) {
    console.error('World ID v4 verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
