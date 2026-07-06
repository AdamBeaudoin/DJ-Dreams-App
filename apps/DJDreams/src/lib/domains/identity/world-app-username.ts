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

  const address = MiniKit.user.walletAddress
  if (!address) return undefined

  try {
    const userInfo = await MiniKit.getUserByAddress(address)
    return sanitizeUsername(userInfo.username) ?? undefined
  } catch {
    return undefined
  }
}
