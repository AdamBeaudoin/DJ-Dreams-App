export const MAX_MESSAGE_LENGTH = 200

export interface ChatMessage {
  id: string
  user_id: string
  username: string
  message: string
  verified: boolean
  session_nullifier?: string
  is_moderated?: boolean
  is_donor?: boolean // Computed server-side, not persisted
  created_at: string
}

export type ChatMessageInsert = Omit<ChatMessage, 'id' | 'created_at' | 'is_donor'>
