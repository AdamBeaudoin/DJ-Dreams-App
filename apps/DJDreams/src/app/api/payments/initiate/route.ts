import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/domains/identity/auth'
import { createReference, reuseOrCreateReference } from '@/lib/domains/payments/repository'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession()
    if (auth.error) return auth.error

    const body = await req.json().catch(() => ({}))
    const purpose = body.purpose || 'tip'
    if (purpose !== 'tip' && purpose !== 'boost') {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 })
    }

    const { id } = await reuseOrCreateReference(auth.session.nullifier, purpose)

    return NextResponse.json({ id })
  } catch (error) {
    console.error('Initiate payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
