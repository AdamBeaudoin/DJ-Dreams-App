import { getSupabaseServer } from '@/lib/supabaseServer'
import { getDonorNullifiers } from '@/lib/domains/payments/repository'
import type { ChatMessage, ChatMessageInsert } from './types'

const MESSAGE_COLUMNS = 'id, user_id, username, message, verified, is_moderated, is_boosted, created_at'

export async function fetchMessages(limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
  const { data, error } = await getSupabaseServer()
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`)
  }

  // Reverse to show oldest first in UI
  return ((data as ChatMessage[]) || []).reverse()
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

  return message as ChatMessage
}

export async function enrichMessagesWithDonorStatus(messages: ChatMessage[]): Promise<ChatMessage[]> {
  const uniqueNullifiers = [...new Set(messages.map(m => m.user_id))]
  const donorSet = await getDonorNullifiers(uniqueNullifiers)

  return messages.map(m => ({
    ...m,
    is_donor: donorSet.has(m.user_id),
  }))
}
