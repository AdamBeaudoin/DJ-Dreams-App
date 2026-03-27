import { NextRequest, NextResponse } from 'next/server'
import { generateRpContext } from '@/lib/domains/identity/rp-context'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'dj-dreams-chat-verification'

    const rpContext = generateRpContext(action)

    return NextResponse.json(rpContext)
  } catch (error) {
    console.error('RP context generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate RP context' },
      { status: 500 }
    )
  }
}
