'use client'

import { useState, useCallback, useRef, useEffect, type ComponentProps } from 'react'
import dynamic from 'next/dynamic'
import { ShieldCheck } from 'lucide-react'
import type { IDKitResult, RpContext } from '@worldcoin/idkit'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/use-toast'
import { useWalletAuthUpgrade } from '@/hooks/useWalletAuthUpgrade'
import { tryReadEnv } from '@/lib/env'

// @worldcoin/idkit is a heavy dependency. Load it only when a user actually
// starts verification (unverified users who click) instead of shipping it in
// the initial bundle for everyone.
const IDKitRequestWidget = dynamic(
  async () => (await import('@worldcoin/idkit')).IDKitRequestWidget,
  { ssr: false }
)

type IDKitPreset = ComponentProps<typeof IDKitRequestWidget>['preset']

interface WorldIdVerifyProps {
  onVerified: (nullifier: string, username: string) => void
  /** Stretch button to full container width (mobile chat CTA). */
  fullWidth?: boolean
}

interface VerifyResult {
  nullifier: string
  username: string
}

export function WorldIdVerify({ onVerified, fullWidth = false }: WorldIdVerifyProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rpContext, setRpContext] = useState<RpContext | null>(null)
  const [preset, setPreset] = useState<IDKitPreset | null>(null)
  const verifyResultRef = useRef<VerifyResult | null>(null)
  // Lets a toast "retry" action call the latest upgrade routine without a
  // self-referential useCallback dependency or a stale closure.
  const runUpgradeRef = useRef<(() => Promise<void>) | null>(null)
  const { toast } = useToast()
  const runWalletAuthUpgradeStep = useWalletAuthUpgrade()

  const fetchRpContext = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/identity/rp-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dj-dreams-chat-verification' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get RP context')

      // Loading idkit here (rather than statically) keeps it out of the initial
      // bundle; the dynamic widget below shares this same chunk.
      const { deviceLegacy } = await import('@worldcoin/idkit')
      setPreset(deviceLegacy())

      setRpContext({
        rp_id: data.rp_id,
        nonce: data.nonce,
        created_at: data.created_at,
        expires_at: data.expires_at,
        signature: data.sig,
      })
      setIsOpen(true)
    } catch (error) {
      console.error('RP context error:', error)
      toast({
        title: 'Verification Error',
        description: 'Could not start verification. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const handleVerify = async (result: IDKitResult) => {
    // World ID verify only proves personhood and returns a nullifier — it does
    // NOT include a username. The session starts as "Human #xxxxxx" and is
    // upgraded to the real World App username by walletAuth in handleSuccess.
    const res = await fetch('/api/identity/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof: result }),
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      throw new Error(data.error || data.detail || 'Verification failed')
    }

    // Store result for handleSuccess to read — avoids a second API call
    verifyResultRef.current = { nullifier: data.data.nullifier, username: data.data.username }
  }

  // Upgrades the just-verified session to the user's real World App username via
  // MiniKit Wallet Auth (SIWE). The shared hook runs the upgrade + toast matrix;
  // chat still works with the fallback "Human #xxxxxx" name in every non-ok
  // branch, so onVerified always fires to unlock the chat.
  const runWalletAuthUpgrade = useCallback(async () => {
    const result = verifyResultRef.current
    if (!result) return

    setIsLoading(true)
    let upgrade
    try {
      upgrade = await runWalletAuthUpgradeStep(result.nullifier, {
        context: 'verify',
        fallbackUsername: result.username,
        retry: () => void runUpgradeRef.current?.(),
      })
    } finally {
      setIsLoading(false)
    }

    const finalUsername = upgrade.username ?? result.username
    onVerified(result.nullifier, finalUsername)

    // Clear the stashed result on terminal outcomes; keep it for rejected/error
    // so the toast's retry can re-run the upgrade.
    if (upgrade.status === 'ok' || upgrade.status === 'unavailable') {
      verifyResultRef.current = null
    }
  }, [onVerified, runWalletAuthUpgradeStep])

  useEffect(() => {
    runUpgradeRef.current = runWalletAuthUpgrade
  }, [runWalletAuthUpgrade])

  const handleSuccess = () => {
    void runWalletAuthUpgrade()
  }

  const handleError = (errorCode: unknown) => {
    console.error('IDKit error:', errorCode)
    toast({
      title: 'Verification Failed',
      description: 'World ID verification failed. Please try again.',
      variant: 'destructive',
    })
  }

  const appId = tryReadEnv('NEXT_PUBLIC_APP_ID') as `app_${string}` | undefined

  return (
    <>
      <Button
        onClick={fetchRpContext}
        disabled={isLoading}
        className={`bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 hover:shadow-glow text-sm font-medium px-4 py-1 min-h-[44px] rounded-full touch-manipulation transition-all duration-200 active:scale-[0.97]${fullWidth ? ' w-full' : ''}`}
      >
        {isLoading ? (
          <div className="flex items-center gap-1.5">
            <Spinner size="sm" />
            <span>Verifying…</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span>Verify you are human</span>
          </div>
        )}
      </Button>

      {rpContext && appId && preset && (
        <IDKitRequestWidget
          app_id={appId}
          action="dj-dreams-chat-verification"
          rp_context={rpContext}
          allow_legacy_proofs={true}
          preset={preset}
          open={isOpen}
          onOpenChange={setIsOpen}
          handleVerify={handleVerify}
          onSuccess={handleSuccess}
          onError={handleError}
          autoClose
        />
      )}
    </>
  )
}
