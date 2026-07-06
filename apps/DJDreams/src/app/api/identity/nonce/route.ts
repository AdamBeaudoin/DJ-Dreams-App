import { NextResponse } from 'next/server'
import { issueNonce } from '@/lib/domains/identity/nonce-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Issue a single-use SIWE nonce for MiniKit Wallet Auth. The client passes this
 * nonce into MiniKit.walletAuth; it is embedded in the signed message and later
 * consumed by /api/identity/verify-wallet to confirm the message was issued by us.
 */
export async function POST() {
  try {
    const nonce = issueNonce()
    return NextResponse.json({ nonce })
  } catch (error) {
    console.error('Nonce issue error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
