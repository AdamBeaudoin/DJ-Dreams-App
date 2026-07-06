import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/domains/identity/auth'
import { updateSessionUsername } from '@/lib/domains/identity/session'
import { isFallbackUsername, sanitizeUsername } from '@/lib/domains/identity/username'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireSession()
    if (auth.error) return auth.error

    const { username } = await req.json()
    const sanitized = sanitizeUsername(username)

    if (!sanitized) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    }

    if (sanitized === auth.session.username) {
      return NextResponse.json({ data: { username: sanitized } })
    }

    // Only auto-refresh away from generated fallback names
    if (!isFallbackUsername(auth.session.username)) {
      return NextResponse.json({ error: 'Username already set' }, { status: 409 })
    }

    const session = await updateSessionUsername(auth.session.nullifier, sanitized)

    return NextResponse.json({ data: { username: session.username } })
  } catch (error) {
    console.error('Session username update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
