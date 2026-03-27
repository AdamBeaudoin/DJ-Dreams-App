import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/domains/identity/auth'
import { touchSession } from '@/lib/domains/identity/session'
import { insertMessage } from '@/lib/domains/chat/repository'
import { moderateMessage, validateMessage } from '@/lib/domains/moderation/moderation'
import { hasRecentBoostPayment } from '@/lib/domains/payments/repository'
import type { ChatMessageInsert } from '@/lib/domains/chat/types'

export const dynamic = 'force-dynamic'

const TOUCH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession()
    if (auth.error) return auth.error

    const { session } = auth
    const { message, is_boosted } = await req.json()

    // Validate boost claim against recent payment
    if (is_boosted) {
      const hasPaid = await hasRecentBoostPayment(session.nullifier)
      if (!hasPaid) {
        return NextResponse.json({ error: 'Boost payment required' }, { status: 403 })
      }
    }

    const validation = validateMessage(message)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const moderation = moderateMessage(message)

    if (!moderation.isClean) {
      console.log('Moderated message:', {
        user: session.username,
        flaggedWords: moderation.flaggedWords,
      })
    }

    const messageData: ChatMessageInsert = {
      user_id: session.nullifier,
      username: session.username,
      message: moderation.filteredMessage,
      verified: true,
      session_nullifier: session.nullifier,
      is_moderated: !moderation.isClean,
      is_boosted: is_boosted || false,
    }

    const savedMessage = await insertMessage(messageData)

    // Only touch session if last_seen is older than 5 minutes
    const lastSeen = new Date(session.last_seen_at).getTime()
    if (Date.now() - lastSeen > TOUCH_INTERVAL_MS) {
      touchSession(session.nullifier)
    }

    return NextResponse.json({ data: { message: savedMessage, moderated: !moderation.isClean } })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
