import { NextRequest, NextResponse } from 'next/server'
import { fetchMessages, enrichMessagesWithDonorStatus } from '@/lib/domains/chat/repository'

export const dynamic = 'force-dynamic'

const MAX_PAGE_SIZE = 100

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50', 10), MAX_PAGE_SIZE)
    const offset = Math.max(Number.parseInt(searchParams.get('offset') || '0', 10), 0)

    const rawMessages = await fetchMessages(limit, offset)
    const messages = await enrichMessagesWithDonorStatus(rawMessages)

    return NextResponse.json({ data: { messages } })
  } catch (error) {
    console.error('Fetch messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
