import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { lookupSession } from './session'
import type { VerifiedSession } from './types'

const SESSION_COOKIE = 'dj-session'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
}

/**
 * Set an HTTP-only session cookie containing the nullifier.
 * Call this after successful World ID verification.
 */
export function setSessionCookie(response: NextResponse, nullifier: string): void {
  response.cookies.set(SESSION_COOKIE, nullifier, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: COOKIE_MAX_AGE,
  })
}

/**
 * Read the session cookie and return the nullifier, or null if absent.
 */
export function getSessionNullifier(): string | null {
  const cookieStore = cookies()
  return cookieStore.get(SESSION_COOKIE)?.value ?? null
}

/**
 * Clear the session cookie (for logout).
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 0,
  })
}

type AuthResult =
  | { session: VerifiedSession; error?: never }
  | { session?: never; error: NextResponse }

/**
 * Require a valid session from the request cookie.
 * Returns the session on success, or a NextResponse error on failure.
 *
 * Usage in route handlers:
 *   const auth = await requireSession()
 *   if (auth.error) return auth.error
 *   // auth.session is now guaranteed
 */
export async function requireSession(): Promise<AuthResult> {
  const nullifier = getSessionNullifier()

  if (!nullifier) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  const session = await lookupSession(nullifier)

  if (!session) {
    return { error: NextResponse.json({ error: 'Invalid or expired session' }, { status: 403 }) }
  }

  return { session }
}
