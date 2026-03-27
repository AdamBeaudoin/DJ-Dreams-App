import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/domains/identity/auth'
import { getDonorNullifiers } from '@/lib/domains/payments/repository'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSession()
    if (auth.error) return auth.error

    const donorSet = await getDonorNullifiers([auth.session.nullifier])
    const isDonor = donorSet.has(auth.session.nullifier)

    return NextResponse.json({ isDonor })
  } catch (error) {
    console.error('Donor check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
