import { randomBytes } from 'crypto'
import { getSupabaseServer } from '@/lib/supabaseServer'
import type { VerifiedSession } from './types'

/**
 * Look up a session by its opaque cookie token.
 *
 * Nullifiers are public (they appear as user_id on every chat message), so
 * they must never act as the session credential — only this random token does.
 */
export async function lookupSessionByToken(token: string): Promise<VerifiedSession | null> {
  const { data, error } = await getSupabaseServer()
    .from('verified_sessions')
    .select('*')
    .eq('session_token', token)
    .single()

  // PGRST116 = "no rows returned" — the only expected "not found" case
  if (error?.code === 'PGRST116') return null
  if (error) {
    throw new Error(`Session lookup failed: ${error.message}`)
  }
  if (!data) return null
  return data as VerifiedSession
}

export async function createSession(nullifier: string, username: string): Promise<VerifiedSession> {
  // 256-bit random token; rotated on every re-verification
  const sessionToken = randomBytes(32).toString('hex')

  const { data, error } = await getSupabaseServer()
    .from('verified_sessions')
    .upsert(
      { nullifier, username, session_token: sessionToken, last_seen_at: new Date().toISOString() },
      { onConflict: 'nullifier' }
    )
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message}`)
  }

  return data as VerifiedSession
}

export async function touchSession(nullifier: string): Promise<void> {
  await getSupabaseServer()
    .from('verified_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('nullifier', nullifier)
}
