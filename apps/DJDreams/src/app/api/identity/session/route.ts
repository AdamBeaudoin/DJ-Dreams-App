import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/domains/identity/auth'

export const dynamic = 'force-dynamic'

/**
 * Server-authoritative session lookup for the client. Returns the nullifier and
 * username bound to the session cookie, or 401/403 when there is no valid
 * session. The client uses this on mount to sync its local state with the
 * server (which owns the post-walletAuth username) instead of trusting
 * localStorage alone.
 */
export async function GET() {
  try {
    const auth = await requireSession()
    if (auth.error) return auth.error

    return NextResponse.json({
      data: {
        nullifier: auth.session.nullifier,
        username: auth.session.username,
      },
    })
  } catch (error) {
    console.error('Session lookup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
