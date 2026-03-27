export const MAX_MESSAGE_LENGTH = 200

export interface ChatMessage {
  id: string
  user_id: string
  username: string
  message: string
  verified: boolean
  nullifier_hash?: string
  session_nullifier?: string
  is_moderated?: boolean
  is_boosted?: boolean
  is_donor?: boolean // Computed server-side, not persisted
  created_at: string
}

export type ChatMessageInsert = Omit<ChatMessage, 'id' | 'created_at' | 'is_donor'>
