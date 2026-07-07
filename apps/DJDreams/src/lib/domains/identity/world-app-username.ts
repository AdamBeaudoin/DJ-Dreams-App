'use client'

import { MiniKit } from '@worldcoin/minikit-js'
import { sanitizeUsername } from './username'

/**
 * Resolve the current user's World App username from MiniKit.
 * IDKit proofs do not include usernames — MiniKit is the source inside World App.
 */
export async function resolveWorldAppUsername(): Promise<string | undefined> {
  if (typeof window === 'undefined' || !MiniKit.isInstalled()) {
    return undefined
  }

  const cached = sanitizeUsername(MiniKit.user.username)
  if (cached) return cached

  // MiniKit.user.walletAddress may not be populated yet right after walletAuth
  // (async SDK state). getUserByAddress's address arg is optional — passing the
  // wallet address when we have it, or letting the SDK fall back to its internal
  // state when we don't, avoids bailing early with undefined.
  try {
    const userInfo = await MiniKit.getUserByAddress(MiniKit.user.walletAddress)
    return sanitizeUsername(userInfo.username) ?? undefined
  } catch {
    return undefined
  }
}
