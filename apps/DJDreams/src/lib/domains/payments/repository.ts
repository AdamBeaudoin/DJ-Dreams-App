import { getSupabaseServer } from '@/lib/supabaseServer'

const REFERENCE_TTL_MS = 15 * 60 * 1000 // 15 minutes

export async function createReference(nullifier: string, purpose: string): Promise<{ id: string }> {
  const id = crypto.randomUUID().replace(/-/g, '')

  const { error } = await getSupabaseServer()
    .from('payment_references')
    .insert({ id, nullifier, purpose, used: false })

  if (error) {
    throw new Error(`Failed to create payment reference: ${error.message}`)
  }

  return { id }
}

/**
 * Return an existing unused, unexpired reference for this nullifier+purpose,
 * or create a new one. Prevents accumulation of dangling references.
 */
export async function reuseOrCreateReference(nullifier: string, purpose: string): Promise<{ id: string }> {
  const cutoff = new Date(Date.now() - REFERENCE_TTL_MS).toISOString()

  const { data: existing } = await getSupabaseServer()
    .from('payment_references')
    .select('id')
    .eq('nullifier', nullifier)
    .eq('purpose', purpose)
    .eq('used', false)
    .gt('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    return { id: existing.id }
  }

  return createReference(nullifier, purpose)
}

/**
 * Atomically consume a payment reference. Returns true if the reference
 * was valid, unused, not expired, and matched the nullifier. Returns false otherwise.
 */
export async function consumeReference(
  referenceId: string,
  nullifier: string,
  transactionId: string
): Promise<boolean> {
  const cutoff = new Date(Date.now() - REFERENCE_TTL_MS).toISOString()

  const { data, error } = await getSupabaseServer()
    .from('payment_references')
    .update({
      used: true,
      verified_at: new Date().toISOString(),
      transaction_id: transactionId,
    })
    .eq('id', referenceId)
    .eq('nullifier', nullifier)
    .eq('used', false)
    .gt('created_at', cutoff)
    .select()
    .single()

  if (error || !data) return false
  return true
}

// In-memory donor cache — donor status is monotonic (once a donor, always a donor)
const DONOR_CACHE_TTL_MS = 60_000 // 60 seconds
const donorCache = new Map<string, { isDonor: boolean; fetchedAt: number }>()

/** Exposed for tests only. */
export function _clearDonorCacheForTests(): void {
  donorCache.clear()
}

/**
 * Batch lookup: which of the given nullifiers have ever completed a payment?
 * Results are cached for 60 seconds per nullifier.
 */
export async function getDonorNullifiers(nullifiers: string[]): Promise<Set<string>> {
  if (nullifiers.length === 0) return new Set()

  const now = Date.now()
  const result = new Set<string>()
  const uncached: string[] = []

  for (const n of nullifiers) {
    const cached = donorCache.get(n)
    if (cached && now - cached.fetchedAt < DONOR_CACHE_TTL_MS) {
      if (cached.isDonor) result.add(n)
    } else {
      uncached.push(n)
    }
  }

  if (uncached.length === 0) return result

  const { data, error } = await getSupabaseServer()
    .from('payment_references')
    .select('nullifier')
    .in('nullifier', uncached)
    .eq('used', true)

  const fetchedDonors = new Set(
    (error || !data) ? [] : data.map((r: { nullifier: string }) => r.nullifier)
  )

  for (const n of uncached) {
    const isDonor = fetchedDonors.has(n)
    donorCache.set(n, { isDonor, fetchedAt: now })
    if (isDonor) result.add(n)
  }

  return result
}

const BOOST_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Check if the user has a recently consumed boost payment (within 5 minutes).
 * Used to validate boosted message claims.
 */
export async function hasRecentBoostPayment(nullifier: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - BOOST_WINDOW_MS).toISOString()

  const { data, error } = await getSupabaseServer()
    .from('payment_references')
    .select('id')
    .eq('nullifier', nullifier)
    .eq('purpose', 'boost')
    .eq('used', true)
    .gt('verified_at', cutoff)
    .limit(1)

  return !error && !!data && data.length > 0
}
