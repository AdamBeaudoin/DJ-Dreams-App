import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create a null client if environment variables are not set
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null

export interface ChatMessage {
  id: string
  user_id: string
  username: string
  message: string
  verified: boolean
  nullifier_hash?: string
  timestamp: string
  is_moderated: boolean
  created_at: string
}

export type ChatMessageInsert = Omit<ChatMessage, 'id' | 'created_at' | 'timestamp'> 