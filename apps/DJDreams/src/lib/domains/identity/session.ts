import { randomBytes } from 'crypto'
import { getSupabaseServer } from '@/lib/supabaseServer'
import type { VerifiedSession } from './types'

/**
 * Server-side session lifetime. The session cookie has the same max-age, but the
 * cookie can be replayed if a client holds onto it — enforcing the age here on
 * `created_at` means an old session row is rejected even if the cookie lingers.
 * Matches `COOKIE_MAX_AGE` in auth.ts (30 days).
 */
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Runtime guard for rows read from `verified_sessions`. Supabase responses are
 * typed loosely; this catches schema drift (a renamed/dropped column, a partial
 * projection) before it becomes a confusing downstream error.
 */
function isVerifiedSession(data: unknown): data is VerifiedSession {
  if (typeof data !== 'object' || data === null) return false
  const s = data as Record<string, unknown>
  return (
    typeof s.nullifier === 'string' &&
    typeof s.username === 'string' &&
    typeof s.session_token === 'string' &&
    typeof s.created_at === 'string' &&
    typeof s.last_seen_at === 'string'
  )
}

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
  if (!isVerifiedSession(data)) {
    throw new Error('Session lookup failed: malformed verified_sessions row')
  }
  // Enforce server-side expiry: a session older than SESSION_MAX_AGE_MS (from
  // created_at) is treated as not found, so requireSession returns 403 and the
  // client clears its stale local session.
  const createdAt = new Date(data.created_at).getTime()
  if (Number.isFinite(createdAt) && Date.now() - createdAt > SESSION_MAX_AGE_MS) {
    return null
  }
  return data
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
  if (!isVerifiedSession(data)) {
    throw new Error('Failed to create session: malformed verified_sessions row')
  }

  return data
}

export async function touchSession(nullifier: string): Promise<void> {
  await getSupabaseServer()
    .from('verified_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('nullifier', nullifier)
}

export async function updateSessionUsername(
  nullifier: string,
  username: string
): Promise<VerifiedSession> {
  const { data, error } = await getSupabaseServer()
    .from('verified_sessions')
    .update({ username, last_seen_at: new Date().toISOString() })
    .eq('nullifier', nullifier)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to update session username: ${error?.message}`)
  }
  if (!isVerifiedSession(data)) {
    throw new Error('Failed to update session username: malformed verified_sessions row')
  }

  return data
}

/**
 * Upgrade a session after successful MiniKit Wallet Auth: stamp the real World App
 * username and the SIWE-verified wallet address onto the existing session row.
 *
 * Requires the `wallet_address` column (migration 003). Callers should fall back to
 * `updateSessionUsername` if this throws (e.g. migration not yet applied).
 */
export async function updateSessionWalletAuth(
  nullifier: string,
  username: string,
  walletAddress: string
): Promise<VerifiedSession> {
  const { data, error } = await getSupabaseServer()
    .from('verified_sessions')
    .update({
      username,
      wallet_address: walletAddress,
      last_seen_at: new Date().toISOString(),
    })
    .eq('nullifier', nullifier)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to update session wallet auth: ${error?.message}`)
  }
  if (!isVerifiedSession(data)) {
    throw new Error('Failed to update session wallet auth: malformed verified_sessions row')
  }

  return data
}
