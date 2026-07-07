import { sanitizeUsername } from './username'

/**
 * Base URL of World's public usernames service. The lookup endpoint resolves an
 * ENS-compatible World App username from a wallet address and requires no auth.
 * Docs: https://usernames.worldcoin.org/docs
 */
const WORLD_USERNAMES_BASE_URL = 'https://usernames.worldcoin.org'

/**
 * Resolve a World App username from a wallet address using World's public
 * usernames service (`GET /api/v1/usernames/:address`).
 *
 * Server-side only. Used after SIWE verification in `/api/identity/verify-wallet`
 * so the session username is resolved authoritatively from the SIWE-verified
 * wallet address — independent of the client's `MiniKit.user` state, which is
 * populated asynchronously and unreliably right after `commandsAsync.walletAuth`.
 *
 * Returns the sanitized username, or `null` when the address has no username,
 * the service is unavailable, or the response is malformed. Callers fall back
 * to the client-supplied hint and then the existing session username.
 */
export async function resolveUsernameByAddress(address: string): Promise<string | null> {
  if (!address) return null

  try {
    const res = await fetch(
      `${WORLD_USERNAMES_BASE_URL}/api/v1/usernames/${address}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null

    const data = (await res.json()) as unknown
    if (typeof data !== 'object' || data === null) return null

    const username = (data as Record<string, unknown>).username
    return sanitizeUsername(username)
  } catch {
    // Network error, DNS, JSON parse, etc. — callers keep the fallback name.
    return null
  }
}
