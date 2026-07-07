'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'
import { IDKitRequestWidget } from '@worldcoin/idkit'
import { deviceLegacy, type IDKitResult, type RpContext } from '@worldcoin/idkit'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/components/ui/use-toast'
import {
  upgradeSessionWithWalletAuth,
  type WalletAuthUpgrade,
} from '@/lib/domains/identity/wallet-auth-client'
import { tryReadEnv } from '@/lib/env'

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
  const verifyResultRef = useRef<VerifyResult | null>(null)
  // Lets a toast "retry" action call the latest upgrade routine without a
  // self-referential useCallback dependency or a stale closure.
  const runUpgradeRef = useRef<(() => Promise<void>) | null>(null)
  const { toast } = useToast()

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
  // MiniKit Wallet Auth (SIWE). Typed outcome drives the toast + retry affordance;
  // we never claim success when walletAuth failed. Verify and chat still work with
  // the fallback "Human #xxxxxx" name in every non-ok branch.
  const runWalletAuthUpgrade = useCallback(async () => {
    const result = verifyResultRef.current
    if (!result) return

    setIsLoading(true)
    let upgrade: WalletAuthUpgrade
    try {
      upgrade = await upgradeSessionWithWalletAuth(result.nullifier)
    } finally {
      setIsLoading(false)
    }

    if (upgrade.username) {
      result.username = upgrade.username
    }

    const retry = () => {
      void runUpgradeRef.current?.()
    }

    switch (upgrade.status) {
      case 'ok':
        toast({
          title: 'Verified!',
          description: upgrade.username
            ? `Welcome ${upgrade.username}! You can now chat.`
            : 'You can now chat. Your World App username will appear shortly.',
        })
        onVerified(result.nullifier, result.username)
        verifyResultRef.current = null
        break
      case 'unavailable':
        // Outside World App — expected, no retry possible here. Chat works.
        toast({
          title: 'Verified!',
          description: 'Open DJ Dreams in World App to show your username. You can chat now.',
        })
        onVerified(result.nullifier, result.username)
        verifyResultRef.current = null
        break
      case 'rejected':
        toast({
          title: 'Username skipped',
          description: `You're chatting as ${result.username}. Connect your World App username to show your name.`,
          action: (
            <ToastAction altText="Connect username" onClick={retry}>
              Connect username
            </ToastAction>
          ),
        })
        onVerified(result.nullifier, result.username)
        break
      case 'error':
        toast({
          title: 'Username sign-in failed',
          description: `You're chatting as ${result.username}. Try connecting your username again.`,
          variant: 'destructive',
          action: (
            <ToastAction altText="Try again" onClick={retry}>
              Try again
            </ToastAction>
          ),
        })
        onVerified(result.nullifier, result.username)
        break
    }
  }, [onVerified, toast])

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

      {rpContext && appId && (
        <IDKitRequestWidget
          app_id={appId}
          action="dj-dreams-chat-verification"
          rp_context={rpContext}
          allow_legacy_proofs={true}
          preset={deviceLegacy()}
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
