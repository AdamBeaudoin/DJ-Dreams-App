'use client'

import { MiniKit, type MiniAppWalletAuthPayload } from '@worldcoin/minikit-js'
import { sanitizeUsername } from './username'
import { WALLET_AUTH_STATEMENT, WALLET_AUTH_EXPIRATION_MS } from './wallet-auth'

/**
 * Outcome of a walletAuth upgrade attempt. The function never throws and never
 * returns null — callers branch on `status` to decide what to show the user.
 *
 * - `ok`         — SIWE verified server-side; `username`/`walletAddress` may
 *                  still be absent if the SDK didn't surface a username.
 * - `rejected`   — user dismissed or rejected the wallet sign-in prompt.
 * - `unavailable`— MiniKit not installed (outside World App). Expected on web;
 *                  verify + chat still work with the fallback username.
 * - `error`      — something went wrong (nonce request, network, server reject).
 *                  Worth surfacing and offering a retry.
 */
export type WalletAuthStatus = 'ok' | 'rejected' | 'unavailable' | 'error'

export interface WalletAuthUpgrade {
  status: WalletAuthStatus
  username?: string
  walletAddress?: string
  /** Short, loggable reason for non-ok statuses. Not shown verbatim to users. */
  message?: string
}

/**
 * Resolve a World App username from a wallet address via MiniKit, swallowing
 * errors so a failed lookup never breaks the upgrade — the server resolves
 * authoritatively from the same address, so a missing client hint is fine.
 */
async function safeGetUsernameByAddress(address: string): Promise<string | undefined> {
  try {
    const info = await MiniKit.getUserByAddress(address)
    return sanitizeUsername(info?.username) ?? undefined
  } catch {
    return undefined
  }
}

/**
 * Run MiniKit Wallet Auth after a successful World ID verify, then POST the
 * signed SIWE payload to /api/identity/verify-wallet so the session username is
 * upgraded from the "Human #xxxxxx" fallback to the user's real World App
 * username. Returns a typed result so the UI can distinguish a real failure
 * (offer retry) from "not in World App" (informational) from success.
 *
 * Note: in @worldcoin/minikit-js 1.11.0 the async command lives under
 * `MiniKit.commandsAsync.walletAuth` (newer SDKs expose `MiniKit.walletAuth`).
 */
export async function upgradeSessionWithWalletAuth(
  nullifier: string
): Promise<WalletAuthUpgrade> {
  if (typeof window === 'undefined' || !MiniKit.isInstalled()) {
    return { status: 'unavailable', message: 'MiniKit not installed (not in World App).' }
  }

  let nonce: string
  try {
    const nonceRes = await fetch('/api/identity/nonce', { method: 'POST' })
    const nonceData = await nonceRes.json()
    if (!nonceRes.ok || !nonceData.nonce) {
      return { status: 'error', message: 'Could not request sign-in nonce.' }
    }
    nonce = nonceData.nonce as string
  } catch {
    return { status: 'error', message: 'Network error requesting sign-in nonce.' }
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
    return { status: 'error', message: 'Wallet sign-in prompt failed.' }
  }

  if (finalPayload.status !== 'success') {
    return { status: 'rejected', message: 'User rejected the wallet sign-in prompt.' }
  }

  // MiniKit.user.username is populated asynchronously after walletAuth and is
  // unreliable right when the command resolves — the root cause of usernames
  // sticking at "Human #xxxxxx". The SIWE payload's `address` is guaranteed
  // present, so resolve the username explicitly from it (with the cached
  // MiniKit.user.username as a fast path). The server resolves authoritatively
  // from the same address; this hint makes the immediate toast accurate and
  // gives the server a fallback.
  const cached = sanitizeUsername(MiniKit.user.username)
  const worldUsername =
    cached ?? (await safeGetUsernameByAddress(finalPayload.address))

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
    if (!res.ok || data.error) {
      return {
        status: 'error',
        message: (data.error as string) || 'Server rejected the sign-in proof.',
      }
    }
    return {
      status: 'ok',
      username: data.data?.username as string | undefined,
      walletAddress: data.data?.walletAddress as string | undefined,
    }
  } catch {
    return { status: 'error', message: 'Network error completing wallet sign-in.' }
  }
}
