'use client'

import { useCallback, useState } from 'react'
import type { PayCommandInput } from '@worldcoin/minikit-js'
import { useToast } from '@/components/ui/use-toast'
import { env } from '@/lib/env'

interface UseTipFlowOptions {
  nullifier: string | null
  /** Called after a payment is confirmed so callers can flip donor state. */
  onDonor: () => void
}

/**
 * MiniKit WLD tip flow: initiate a payment reference, run the pay command, and
 * confirm it server-side. MiniKit is imported lazily so it stays out of the
 * initial bundle.
 */
export function useTipFlow({ nullifier, onDonor }: UseTipFlowOptions) {
  const [isTipping, setIsTipping] = useState(false)
  const { toast } = useToast()

  const runTipFlow = useCallback(async (): Promise<boolean> => {
    if (!nullifier) {
      toast({ title: 'Verify first', description: 'Please verify with World ID.', variant: 'destructive' })
      return false
    }

    const recipient = env.tipRecipientAddress()
    const amountWld = env.tipAmount()

    try {
      const { MiniKit, Tokens, tokenToDecimals, Network } = await import('@worldcoin/minikit-js')

      if (!MiniKit.isInstalled()) {
        toast({ title: 'Open in World App', description: 'Payments are available in World App.', variant: 'destructive' })
        return false
      }

      const initRes = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const { id: reference, error: initError } = await initRes.json()
      if (!initRes.ok) {
        toast({ title: 'Payment failed', description: initError || 'Could not initiate payment.', variant: 'destructive' })
        return false
      }

      const payInput: PayCommandInput = {
        reference,
        to: recipient,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(amountWld, Tokens.WLD).toString(),
          },
        ],
        description: 'Tip for DJ Dreams',
        network: Network.WorldChain,
      }

      if (!MiniKit.commandsAsync?.pay) {
        toast({ title: 'Open in World App', description: 'Please open in the latest World App to pay.', variant: 'destructive' })
        return false
      }

      const { finalPayload } = await MiniKit.commandsAsync.pay(payInput)

      if (finalPayload.status === 'error') {
        toast({ title: 'Payment cancelled', description: 'Payment was cancelled.', variant: 'destructive' })
        return false
      }

      const confirmRes = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: finalPayload }),
      })
      const confirmJson = await confirmRes.json()

      if (confirmJson.success) {
        onDonor()
        return true
      }

      toast({ title: 'Payment pending', description: 'We are waiting for confirmation on-chain.' })
      return false
    } catch (err) {
      console.error('Payment error:', err)
      toast({ title: 'Payment failed', description: 'Something went wrong. Please try again.', variant: 'destructive' })
      return false
    }
  }, [nullifier, onDonor, toast])

  const tip = useCallback(async () => {
    setIsTipping(true)
    try {
      const success = await runTipFlow()
      if (success) {
        toast({ title: 'Thanks!', description: 'Your tip was sent successfully!' })
      }
    } finally {
      setIsTipping(false)
    }
  }, [runTipFlow, toast])

  return { isTipping, tip }
}
