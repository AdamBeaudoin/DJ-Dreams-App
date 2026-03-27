'use client'

import { useState, useCallback, useRef } from 'react'
import { IDKitRequestWidget } from '@worldcoin/idkit'
import { deviceLegacy, type IDKitResult, type RpContext } from '@worldcoin/idkit'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/use-toast'

interface WorldIdVerifyProps {
  onVerified: (nullifier: string, username: string) => void
}

interface VerifyResult {
  nullifier: string
  username: string
}

export function WorldIdVerify({ onVerified }: WorldIdVerifyProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rpContext, setRpContext] = useState<RpContext | null>(null)
  const verifyResultRef = useRef<VerifyResult | null>(null)
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

  const handleSuccess = () => {
    const result = verifyResultRef.current
    if (result) {
      onVerified(result.nullifier, result.username)
      toast({
        title: 'Verified!',
        description: `Welcome ${result.username}! You can now chat.`,
      })
      verifyResultRef.current = null
    }
  }

  const handleError = (errorCode: unknown) => {
    console.error('IDKit error:', errorCode)
    toast({
      title: 'Verification Failed',
      description: 'World ID verification failed. Please try again.',
      variant: 'destructive',
    })
  }

  const appId = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`

  return (
    <>
      <Button
        onClick={fetchRpContext}
        disabled={isLoading}
        className="bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 text-xs sm:text-sm px-3 py-1 min-h-[44px] rounded-full touch-manipulation"
      >
        {isLoading ? (
          <div className="flex items-center gap-1">
            <Spinner size="sm" />
            <span className="hidden sm:inline">Loading...</span>
          </div>
        ) : (
          <>
            <span className="hidden sm:inline">Verify with World ID</span>
            <span className="sm:hidden">Verify</span>
          </>
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
