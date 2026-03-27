import { NextRequest, NextResponse } from 'next/server'
import { MiniAppPaymentSuccessPayload } from '@worldcoin/minikit-js'
import { requireSession } from '@/lib/domains/identity/auth'
import { consumeReference } from '@/lib/domains/payments/repository'

interface IRequestPayload {
  payload: MiniAppPaymentSuccessPayload
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession()
    if (auth.error) return auth.error

    const { payload } = (await req.json()) as IRequestPayload

    if (!payload?.transaction_id || !payload?.reference) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const appId = process.env.APP_ID || process.env.NEXT_PUBLIC_APP_ID
    const apiKey = process.env.DEV_PORTAL_API_KEY
    if (!appId || !apiKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // Verify transaction with World Developer Portal
    const resp = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transaction_id}?app_id=${appId}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      }
    )

    if (!resp.ok) {
      return NextResponse.json({ error: 'Transaction lookup failed' }, { status: 502 })
    }

    const tx = await resp.json()

    // Require explicit success (not just "not failed")
    if (tx?.reference !== payload.reference || tx?.status !== 'completed') {
      return NextResponse.json({ error: 'Transaction not confirmed' }, { status: 400 })
    }

    // Atomically consume the reference (one-time-use + session binding + expiry)
    const consumed = await consumeReference(payload.reference, auth.session.nullifier, payload.transaction_id)
    if (!consumed) {
      return NextResponse.json({
        error: 'Reference already consumed or session mismatch',
      }, { status: 409 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Confirm payment error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
