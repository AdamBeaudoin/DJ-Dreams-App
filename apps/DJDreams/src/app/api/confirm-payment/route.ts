import { NextRequest, NextResponse } from 'next/server'
import { MiniAppPaymentSuccessPayload } from '@worldcoin/minikit-js'
import { supabaseServer } from '@/lib/supabaseServer'

interface IRequestPayload {
  payload: MiniAppPaymentSuccessPayload
}

export async function POST(req: NextRequest) {
  try {
    const { payload } = (await req.json()) as IRequestPayload

    if (!payload || !payload.transaction_id || !payload.reference) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const appId = process.env.APP_ID || process.env.NEXT_PUBLIC_APP_ID
    const apiKey = process.env.DEV_PORTAL_API_KEY
    if (!appId || !apiKey) {
      return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 })
    }

    const resp = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transaction_id}?app_id=${appId}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
        // Avoid caching
        cache: 'no-store',
      }
    )
    if (!resp.ok) {
      return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 502 })
    }
    const tx = await resp.json()

    // Optimistic acceptance when not failed and reference matches
    if (tx?.reference === payload.reference && tx?.status !== 'failed') {
      // Mark reference as verified
      try {
        if (supabaseServer) {
          await supabaseServer
            .from('payment_references')
            .update({ verified_at: new Date().toISOString(), transaction_id: payload.transaction_id })
            .eq('id', payload.reference)
        }
      } catch {}
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 })
  }
}


