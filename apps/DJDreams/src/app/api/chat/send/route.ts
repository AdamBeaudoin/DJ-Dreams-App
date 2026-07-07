import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/domains/identity/auth'
import { touchSession } from '@/lib/domains/identity/session'
import { insertMessage } from '@/lib/domains/chat/repository'
import { moderateMessage, validateMessage } from '@/lib/domains/moderation/moderation'
import { chatSendRateLimiter } from '@/lib/rate-limit'
import type { ChatMessageInsert } from '@/lib/domains/chat/types'

export const dynamic = 'force-dynamic'

const TOUCH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession()
    if (auth.error) return auth.error

    const { session } = auth

    // Per-nullifier cooldown: 1 message per 2s, max 5 per 10s.
    const limit = chatSendRateLimiter.check(session.nullifier)
    if (!limit.allowed) {
      const retryAfterSeconds = Math.ceil(limit.retryAfterMs / 1000)
      const message =
        limit.reason === 'too-frequent'
          ? 'You are sending messages too quickly. Please slow down.'
          : 'You have sent too many messages. Please wait a moment.'
      return NextResponse.json(
        { error: message, retryAfter: retryAfterSeconds },
        { status: 429, headers: { RetryAfter: String(retryAfterSeconds) } }
      )
    }

    const { message } = await req.json()

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
