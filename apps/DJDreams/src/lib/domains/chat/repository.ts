import { getSupabaseServer } from '@/lib/supabaseServer'
import { getDonorNullifiers } from '@/lib/domains/payments/repository'
import type { ChatMessage, ChatMessageInsert } from './types'

const MESSAGE_COLUMNS = 'id, user_id, username, message, verified, is_moderated, created_at'

/**
 * Runtime guard for rows read from `messages`. Catches schema drift (e.g. a
 * dropped/renamed column) instead of letting an undefined field silently render
 * a broken chat bubble.
 */
function isChatMessage(data: unknown): data is ChatMessage {
  if (typeof data !== 'object' || data === null) return false
  const m = data as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    typeof m.user_id === 'string' &&
    typeof m.username === 'string' &&
    typeof m.message === 'string' &&
    typeof m.verified === 'boolean' &&
    typeof m.created_at === 'string'
  )
}

export async function fetchMessages(limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
  const { data, error } = await getSupabaseServer()
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`)
  }
  if (!Array.isArray(data)) {
    throw new Error('Failed to fetch messages: unexpected response shape')
  }

  // Validate every row; a malformed row signals schema drift and should surface,
  // not silently produce a broken message bubble.
  const messages: ChatMessage[] = []
  for (const row of data) {
    if (!isChatMessage(row)) {
      throw new Error('Failed to fetch messages: malformed row')
    }
    messages.push(row)
  }

  // Reverse to show oldest first in UI
  return messages.reverse()
}

export async function insertMessage(data: ChatMessageInsert): Promise<ChatMessage> {
  const { data: message, error } = await getSupabaseServer()
    .from('messages')
    .insert(data)
    .select(MESSAGE_COLUMNS)
    .single()

  if (error || !message) {
    throw new Error(`Failed to insert message: ${error?.message}`)
  }
  if (!isChatMessage(message)) {
    throw new Error('Failed to insert message: malformed row')
  }

  return message
}

export async function enrichMessagesWithDonorStatus(messages: ChatMessage[]): Promise<ChatMessage[]> {
  const uniqueNullifiers = [...new Set(messages.map(m => m.user_id))]
  const donorSet = await getDonorNullifiers(uniqueNullifiers)

  return messages.map(m => ({
    ...m,
    is_donor: donorSet.has(m.user_id),
  }))
}
