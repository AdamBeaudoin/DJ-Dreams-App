import { NextRequest, NextResponse } from 'next/server'
import { verifySiweMessage, type MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js'
import { requireSession } from '@/lib/domains/identity/auth'
import {
  updateSessionUsername,
  updateSessionWalletAuth,
} from '@/lib/domains/identity/session'
import { consumeNonce } from '@/lib/domains/identity/nonce-store'
import { sanitizeUsername } from '@/lib/domains/identity/username'
import { WALLET_AUTH_STATEMENT } from '@/lib/domains/identity/wallet-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface VerifyWalletBody {
  payload?: MiniAppWalletAuthSuccessPayload
  nonce?: string
  nullifier?: string
  username?: string
}

/**
 * SIWE completion for MiniKit Wallet Auth.
 *
 * Receives the `finalPayload` from `MiniKit.commandsAsync.walletAuth` plus the
 * nonce and the nullifier from the prior World ID verify. Verifies the SIWE
 * signature server-side, then upgrades the SAME session (created by /verify) to
 * carry the user's real World App username and wallet address.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession()
    if (auth.error) return auth.error
    const session = auth.session

    const body = (await req.json().catch(() => ({}))) as VerifyWalletBody
    const { payload, nonce, nullifier, username } = body

    // The wallet auth must upgrade the same session that /verify created —
    // never let one nullifier stamp a username onto another user's session.
    if (!nullifier || nullifier !== session.nullifier) {
      return NextResponse.json({ error: 'Nullifier mismatch' }, { status: 403 })
    }

    if (
      !payload ||
      payload.status !== 'success' ||
      !payload.message ||
      !payload.signature ||
      !payload.address
    ) {
      return NextResponse.json({ error: 'Invalid wallet auth payload' }, { status: 400 })
    }

    if (!consumeNonce(nonce)) {
      return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 400 })
    }

    // verifySiweMessage throws on validation/signature failure and resolves
    // { isValid, siweMessageData } on success. It only runs in Node (throws in DOM).
    let result: { isValid: boolean }
    try {
      result = await verifySiweMessage(payload, nonce, WALLET_AUTH_STATEMENT)
    } catch (error) {
      console.error('SIWE verification failed:', error)
      return NextResponse.json({ error: 'Wallet auth verification failed' }, { status: 401 })
    }

    if (!result?.isValid) {
      return NextResponse.json({ error: 'Wallet auth verification failed' }, { status: 401 })
    }

    const walletAddress = payload.address
    // Username comes from the client (MiniKit.user.username, populated post-walletAuth).
    // If it wasn't supplied, keep the existing session username — the wallet address
    // is stored separately and must never be used as a display name.
    const finalUsername = sanitizeUsername(username) ?? session.username

    // Prefer the wallet+username update (needs migration 003). If the column is
    // missing, fall back to a username-only update so the real username still
    // reaches chat — the wallet address is secondary.
    let updated
    try {
      updated = await updateSessionWalletAuth(session.nullifier, finalUsername, walletAddress)
    } catch (error) {
      console.error('Wallet auth session update failed; falling back to username-only:', error)
      updated = await updateSessionUsername(session.nullifier, finalUsername)
    }

    return NextResponse.json({
      data: {
        nullifier: updated.nullifier,
        username: updated.username,
        walletAddress,
      },
    })
  } catch (error) {
    console.error('verify-wallet error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
