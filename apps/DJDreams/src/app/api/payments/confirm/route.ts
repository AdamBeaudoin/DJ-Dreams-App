import { NextRequest, NextResponse } from 'next/server'
import { MiniAppPaymentSuccessPayload } from '@worldcoin/minikit-js'
import { requireSession } from '@/lib/domains/identity/auth'
import { consumeReference } from '@/lib/domains/payments/repository'
import { env, MissingEnvError } from '@/lib/env'

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

    const appId = env.appId()
    const apiKey = env.devPortalApiKey()

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

    // The transaction is usually still 'pending' when the pay dialog closes —
    // on-chain settlement takes time. Follow World's documented pattern:
    // accept unless the transaction explicitly failed. Double-spends are
    // prevented by the one-time reference consumption below.
    const txStatus = tx?.transaction_status ?? tx?.status
    if (tx?.reference !== payload.reference || txStatus === 'failed') {
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
    if (error instanceof MissingEnvError) {
      console.error('Confirm payment error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    console.error('Confirm payment error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
