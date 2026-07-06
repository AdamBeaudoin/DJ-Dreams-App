import { createClient } from '@supabase/supabase-js'
import { tryReadEnv } from './env'

// Module top-level: use the non-throwing read so a misconfigured deploy (or
// `next build` before env is injected) degrades to a null client instead of
// crashing the browser bundle. Missing required vars are logged once via
// tryReadEnv.
const supabaseUrl = tryReadEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseAnonKey = tryReadEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

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

// Re-export from domain for backward compatibility
export type { ChatMessage, ChatMessageInsert } from './domains/chat/types'
