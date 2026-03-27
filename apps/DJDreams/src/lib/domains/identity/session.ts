import { getSupabaseServer } from '@/lib/supabaseServer'
import type { VerifiedSession } from './types'

export async function lookupSession(nullifier: string): Promise<VerifiedSession | null> {
  const { data, error } = await getSupabaseServer()
    .from('verified_sessions')
    .select('*')
    .eq('nullifier', nullifier)
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
  const { data, error } = await getSupabaseServer()
    .from('verified_sessions')
    .upsert(
      { nullifier, username, last_seen_at: new Date().toISOString() },
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
