import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

let _client: SupabaseClient | null = null

export function getSupabaseServer(): SupabaseClient {
  if (_client) return _client

  // Throws MissingEnvError with the full missing list on first use rather than
  // a generic 500 deeper in the request.
  const supabaseUrl = env.supabaseUrl()
  const serviceRoleKey = env.supabaseServiceRoleKey()

  _client = createClient(supabaseUrl, serviceRoleKey, {
    global: {
      // Next.js patches global fetch and caches GET responses in route
      // handlers by default — without no-store, message reads go stale.
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
    },
  })
  return _client
}

/** Reset the cached client. Only for use in tests. */
export function _resetClientForTests(): void {
  _client = null
}
