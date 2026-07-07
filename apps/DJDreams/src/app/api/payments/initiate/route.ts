import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/domains/identity/auth'
import { reuseOrCreateReference } from '@/lib/domains/payments/repository'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession()
    if (auth.error) return auth.error

    // Body is accepted for forward-compat but ignored — the only payment flow
    // is a tip. Reading it keeps the route tolerant of older clients that still
    // send { purpose: 'tip' }.
    await req.json().catch(() => ({}))

    const { id } = await reuseOrCreateReference(auth.session.nullifier, 'tip')

    return NextResponse.json({ id })
  } catch (error) {
    console.error('Initiate payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
