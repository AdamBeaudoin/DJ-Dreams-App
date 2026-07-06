'use client'

import { MiniKit, type MiniAppWalletAuthPayload } from '@worldcoin/minikit-js'
import { resolveWorldAppUsername } from './world-app-username'
import { WALLET_AUTH_STATEMENT, WALLET_AUTH_EXPIRATION_MS } from './wallet-auth'

export interface WalletAuthUpgrade {
  username?: string
  walletAddress?: string
}

/**
 * Run MiniKit Wallet Auth after a successful World ID verify, then POST the
 * signed SIWE payload to /api/identity/verify-wallet so the session username is
 * upgraded from the "Human #xxxxxx" fallback to the user's real World App username.
 *
 * Returns `null` when MiniKit isn't available, the user rejects the prompt, or the
 * server can't verify the payload. Callers must keep the fallback username in those
 * cases — this function never throws so verify and chat stay working outside World App.
 *
 * Note: in @worldcoin/minikit-js 1.11.0 the async command lives under
 * `MiniKit.commandsAsync.walletAuth` (newer SDKs expose `MiniKit.walletAuth`).
 */
export async function upgradeSessionWithWalletAuth(
  nullifier: string
): Promise<WalletAuthUpgrade | null> {
  if (typeof window === 'undefined' || !MiniKit.isInstalled()) return null

  let nonce: string
  try {
    const nonceRes = await fetch('/api/identity/nonce', { method: 'POST' })
    const nonceData = await nonceRes.json()
    if (!nonceRes.ok || !nonceData.nonce) return null
    nonce = nonceData.nonce as string
  } catch {
    return null
  }

  let finalPayload: MiniAppWalletAuthPayload
  try {
    const result = await MiniKit.commandsAsync.walletAuth({
      nonce,
      statement: WALLET_AUTH_STATEMENT,
      expirationTime: new Date(Date.now() + WALLET_AUTH_EXPIRATION_MS),
    })
    finalPayload = result.finalPayload
  } catch {
    return null
  }

  if (finalPayload.status !== 'success') return null

  // On success the SDK populates MiniKit.user.username / walletAddress. Resolve
  // via the shared helper so the getUserByAddress fallback still applies.
  const worldUsername = await resolveWorldAppUsername()

  try {
    const res = await fetch('/api/identity/verify-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: finalPayload,
        nonce,
        nullifier,
        ...(worldUsername ? { username: worldUsername } : {}),
      }),
    })
    const data = await res.json()
    if (!res.ok || data.error) return null
    return {
      username: data.data?.username as string | undefined,
      walletAddress: data.data?.walletAddress as string | undefined,
    }
  } catch {
    return null
  }
}
