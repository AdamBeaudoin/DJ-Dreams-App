/**
 * Centralized environment-variable access.
 *
 * Why this exists: previously each module read `process.env.X` directly, so a
 * missing variable surfaced as a generic 500 at request time with no hint about
 * what was missing. This module reads each var once, caches it, and gives every
 * caller a single typed accessor. Required vars fail fast with a clear
 * `Missing env vars: X, Y` list at first use — but only at first use (request
 * time), never at import time, so `next build` does not crash.
 *
 * Two usage shapes:
 *   - `env.*` (e.g. `env.appId()`) — throws `MissingEnvError` listing every
 *     missing required var. Use in server route handlers and other runtime
 *     code where a missing var is a hard failure.
 *   - `tryReadEnv(name)` — non-throwing read that logs the missing list once
 *     and returns `undefined`. Use at module top-level (e.g. the browser
 *     Supabase client) where throwing would break the client bundle or the
 *     build.
 *
 * Server-only vars (RP_ID, RP_SIGNING_KEY, DEV_PORTAL_API_KEY,
 * SUPABASE_SERVICE_ROLE_KEY) must never be referenced from client code — they
 * are not inlined into the browser bundle and would always appear "missing".
 */

const REQUIRED_VARS = [
  'NEXT_PUBLIC_APP_ID',
  'RP_ID',
  'RP_SIGNING_KEY',
  'DEV_PORTAL_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

type RequiredVar = (typeof REQUIRED_VARS)[number]

type PublicVar =
  | RequiredVar
  | 'NEXT_PUBLIC_TIP_RECIPIENT_ADDRESS'
  | 'NEXT_PUBLIC_TIP_AMOUNT'

const DEFAULT_TIP_RECIPIENT_ADDRESS = '0x693d8dced3be29222691123656daea9f18e95f4b'
const DEFAULT_TIP_AMOUNT = 1

const cache = new Map<string, string | undefined>()
let missingWarned = false

/** Read a var from `process.env` once and memoize the result. */
function readOnce(name: string): string | undefined {
  if (!cache.has(name)) {
    cache.set(name, process.env[name] as string | undefined)
  }
  return cache.get(name)
}

/** Names of all required vars that are currently unset/empty. */
function missingRequired(): string[] {
  return REQUIRED_VARS.filter((v) => {
    const val = readOnce(v)
    return val === undefined || val === ''
  })
}

export class MissingEnvError extends Error {
  readonly missing: string[]
  constructor(missing: string[]) {
    super(`Missing env vars: ${missing.join(', ')}`)
    this.name = 'MissingEnvError'
    this.missing = missing
  }
}

/**
 * Return a required var, or throw `MissingEnvError` listing every missing
 * required var (not just the one requested) so the operator sees the full
 * picture the first time any required accessor runs.
 */
function requireVar(name: RequiredVar): string {
  const missing = missingRequired()
  if (missing.length > 0) {
    throw new MissingEnvError(missing)
  }
  return readOnce(name) as string
}

export const env = {
  // --- Public (NEXT_PUBLIC_) — safe to read on client and server ---
  /** World App / MiniKit app id, e.g. `app_xxx`. */
  appId: (): string => requireVar('NEXT_PUBLIC_APP_ID'),
  /** Supabase project URL (browser + server). */
  supabaseUrl: (): string => requireVar('NEXT_PUBLIC_SUPABASE_URL'),
  /** Supabase anon key (browser + server). */
  supabaseAnonKey: (): string => requireVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  /** Tip recipient wallet. Optional — falls back to the project default. */
  tipRecipientAddress: (): string =>
    readOnce('NEXT_PUBLIC_TIP_RECIPIENT_ADDRESS') ?? DEFAULT_TIP_RECIPIENT_ADDRESS,
  /** Tip amount in WLD. Optional — falls back to `1`. */
  tipAmount: (): number =>
    Number(readOnce('NEXT_PUBLIC_TIP_AMOUNT') ?? String(DEFAULT_TIP_AMOUNT)),

  // --- Server-only — never reference from client code ---
  /** World ID relying-party id. */
  rpId: (): string => requireVar('RP_ID'),
  /** World ID relying-party ECDSA signing key (hex). */
  rpSigningKey: (): string => requireVar('RP_SIGNING_KEY'),
  /** World Developer Portal API key. */
  devPortalApiKey: (): string => requireVar('DEV_PORTAL_API_KEY'),
  /** Supabase service-role key. Server only — never expose to the browser. */
  supabaseServiceRoleKey: (): string => requireVar('SUPABASE_SERVICE_ROLE_KEY'),
}

/**
 * Non-throwing read for module top-level / client-bundle contexts where
 * throwing would break the build or the browser. Logs the missing required
 * list once (so misconfigured deploys are still visible) and returns
 * `undefined` for the requested var.
 */
export function tryReadEnv(name: PublicVar): string | undefined {
  const missing = missingRequired()
  if (missing.length > 0 && !missingWarned) {
    missingWarned = true
    console.warn(`Missing env vars: ${missing.join(', ')}`)
  }
  return readOnce(name)
}

/** Test-only: clear the cache and the warn-once flag. */
export function _resetEnvForTests(): void {
  cache.clear()
  missingWarned = false
}
