import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(_req: NextRequest) {
  const id = crypto.randomUUID().replace(/-/g, '')

  // Optionally persist the reference for later verification
  try {
    if (supabaseServer) {
      await supabaseServer.from('payment_references').insert({ id, purpose: 'tip' })
    }
  } catch {
    // best-effort; do not block
  }

  return NextResponse.json({ id })
}


