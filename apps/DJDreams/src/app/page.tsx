'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { StreamPlayer, type StreamPlayerHandle } from '@/components/stream-player'
import { ChatRoom } from '@/components/chat-room'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'
import type { PayCommandInput } from '@worldcoin/minikit-js'
import { isFallbackUsername } from '@/lib/domains/identity/username'
import { upgradeSessionWithWalletAuth } from '@/lib/domains/identity/wallet-auth-client'
import { env } from '@/lib/env'

const STORAGE_KEY = 'dj-dreams-session'

export default function HomePage() {
  const [isTipping, setIsTipping] = useState(false)
  const [nullifier, setNullifier] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  /** False until GET /api/identity/session completes — never trust localStorage alone for write access. */
  const [sessionChecked, setSessionChecked] = useState(false)
  const [isUpgradingName, setIsUpgradingName] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)
  const [isDonor, setIsDonor] = useState(false)
  const { toast } = useToast()

  const streamPlayerRef = useRef<StreamPlayerHandle>(null)
  const { messages, isLoading, isConnected, sendMessage } = useRealtimeChat()

  const canWrite = sessionChecked && nullifier !== null

  const handleLandscapeChange = useCallback((landscape: boolean) => {
    setIsLandscape(landscape)
  }, [])

  // Server-authoritative session: do NOT hydrate nullifier from localStorage
  // before the server confirms the session cookie. Stale localStorage was
  // unlocking the chat input even when the cookie was gone — the "I can write
  // without verifying" bug.
  useEffect(() => {
    let cancelled = false

    fetch('/api/identity/session', { method: 'GET' })
      .then(async (res) => {
        if (cancelled) return
        let hasNullifier = false
        if (res.ok) {
          const data = await res.json()
          const s = data?.data
          if (s?.nullifier) {
            hasNullifier = true
            setNullifier(s.nullifier)
            setUsername(s.username || '')
            try {
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ nullifier: s.nullifier, username: s.username || '' })
              )
            } catch {}
          } else {
            setNullifier(null)
            setUsername('')
            try {
              localStorage.removeItem(STORAGE_KEY)
            } catch {}
          }
        } else {
          setNullifier(null)
          setUsername('')
          try {
            localStorage.removeItem(STORAGE_KEY)
          } catch {}
        }
      })
      .catch(() => {
        if (cancelled) return
        setNullifier(null)
        setUsername('')
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {}
      })
      .finally(() => {
        if (!cancelled) setSessionChecked(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // #region agent log
  useEffect(() => {
    if (typeof fetch === 'undefined') return
    const payload = {
      sessionId: '797957',
      runId: 'session-sync-v2',
      hypothesisId: 'H',
      location: 'page.tsx:session-state',
      message: 'client session state',
      data: {
        sessionChecked,
        canWrite,
        hasNullifier: nullifier !== null,
        isFallbackName: !!username && isFallbackUsername(username),
      },
    }
    fetch('http://127.0.0.1:7841/ingest/e247fcfa-b334-4b3c-a271-ed20379bacfb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '797957' },
      body: JSON.stringify({ ...payload, timestamp: Date.now() }),
    }).catch(() => {})
    fetch('/api/debug/client-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})
  }, [sessionChecked, canWrite, nullifier])
  // #endregion

  // Recover a real World App username for an already-verified session that is
  // still on the "Human #xxxxxx" fallback. This is the ONLY reliable path:
  // walletAuth (SIWE) proves a wallet address, which the server resolves to a
  // username authoritatively. It is button-driven (never auto-prompts) so the
  // user always has an explicit sign-in affordance and is never silently stuck.
  const needsUsername = canWrite && isFallbackUsername(username)

  const handleUpgradeUsername = useCallback(async () => {
    if (!nullifier || isUpgradingName) return
    setIsUpgradingName(true)
    try {
      const result = await upgradeSessionWithWalletAuth(nullifier)

      // #region agent log
      const logPayload = {
        sessionId: '797957',
        runId: 'username-upgrade',
        hypothesisId: 'I',
        location: 'page.tsx:handleUpgradeUsername',
        message: 'walletAuth upgrade result',
        data: { status: result.status, gotUsername: !!result.username },
      }
      fetch('http://127.0.0.1:7841/ingest/e247fcfa-b334-4b3c-a271-ed20379bacfb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '797957' },
        body: JSON.stringify({ ...logPayload, timestamp: Date.now() }),
      }).catch(() => {})
      fetch('/api/debug/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logPayload),
      }).catch(() => {})
      // #endregion

      switch (result.status) {
        case 'ok':
          if (result.username) {
            setUsername(result.username)
            try {
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ nullifier, username: result.username })
              )
            } catch {}
            toast({
              title: 'Username connected',
              description: `You're now chatting as ${result.username}.`,
            })
          } else {
            toast({
              title: 'Signed in',
              description: 'Your World App username will appear shortly.',
            })
          }
          break
        case 'unavailable':
          toast({
            title: 'Open in World App',
            description: 'Connect your username from inside World App.',
            variant: 'destructive',
          })
          break
        case 'rejected':
          toast({
            title: 'Sign-in cancelled',
            description: 'Approve the wallet sign-in to show your username.',
          })
          break
        case 'error':
          toast({
            title: 'Could not connect username',
            description: 'Something went wrong. Please try again.',
            variant: 'destructive',
          })
          break
        default: {
          const _exhaustive: never = result.status
          return _exhaustive
        }
      }
    } finally {
      setIsUpgradingName(false)
    }
  }, [nullifier, isUpgradingName, toast])

  // Fetch donor status on mount and when nullifier changes
  useEffect(() => {
    if (!nullifier) return
    fetch('/api/payments/donor-check')
      .then(r => r.json())
      .then(data => { if (data.isDonor) setIsDonor(true) })
      .catch(() => {})
  }, [nullifier])

  const handleVerified = (n: string, u: string) => {
    setNullifier(n)
    setUsername(u)
    setSessionChecked(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nullifier: n, username: u }))
    } catch {}
  }

  // --- Tip payment flow ---
  const runTipFlow = async (): Promise<boolean> => {
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
        setIsDonor(true)
        return true
      } else {
        toast({ title: 'Payment pending', description: 'We are waiting for confirmation on-chain.' })
        return false
      }
    } catch (err) {
      console.error('Payment error:', err)
      toast({ title: 'Payment failed', description: 'Something went wrong. Please try again.', variant: 'destructive' })
      return false
    }
  }

  // --- Tip ---
  const handleTip = useCallback(async () => {
    setIsTipping(true)
    try {
      const success = await runTipFlow()
      if (success) {
        toast({ title: 'Thanks!', description: 'Your tip was sent successfully!' })
      }
    } finally {
      setIsTipping(false)
    }
  }, [nullifier, toast])

  const handleSkipBlocked = useCallback(() => {
    toast({
      title: 'Skip limit reached',
      description: 'Donate to get unlimited skips',
      action: <ToastAction altText="Donate" onClick={handleTip}>Donate</ToastAction>,
    })
  }, [toast, handleTip])

  return (
    <div className="min-h-[100dvh] bg-background overflow-hidden">
      <div className={isLandscape ? 'hidden' : 'container mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-2 max-w-5xl'}>
        <header className="text-center mb-5 sm:mb-6">
          <div className="mb-2 sm:mb-3 flex justify-center">
            <Image
              src="/DJ-Dreams-Logo.jpg"
              alt="DJ Dreams Logo"
              width={280}
              height={96}
              className="h-12 sm:h-16 md:h-20 lg:h-24 w-auto object-contain max-w-[280px] sm:max-w-none drop-shadow-[0_8px_30px_rgba(34,211,238,0.25)]"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const fallback = document.getElementById('logo-fallback')
                if (fallback) fallback.style.display = 'block'
              }}
              priority
            />
            <h1
              id="logo-fallback"
              className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 tracking-tight hidden font-display bg-gradient-to-r from-cyan-300 via-cyan-200 to-fuchsia-300 bg-clip-text text-transparent"
            >
              DJ Dreams
            </h1>
          </div>
          <p className="text-sm text-muted-foreground/80 mb-4 sm:mb-6 px-4 font-normal tracking-wide">
            DJ sets from around the world
          </p>
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={() => streamPlayerRef.current?.previousSet()}
              className="px-4 py-1.5 rounded-full text-xs font-medium min-h-[36px] transition-all duration-200 touch-manipulation text-muted-foreground hover:text-foreground hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
              aria-label="Previous set"
            >
              ‹ Prev
            </button>
            <button
              onClick={handleTip}
              disabled={isTipping}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold min-h-[36px] transition-all duration-200 touch-manipulation focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] ${
                !isTipping
                  ? 'bg-primary/15 text-primary hover:bg-primary/25 hover:shadow-glow border border-primary/30'
                  : 'bg-muted text-muted-foreground cursor-not-allowed border border-transparent'
              }`}
            >
              {isTipping ? 'Sending…' : 'Tip the builder'}
            </button>
            <button
              onClick={() => streamPlayerRef.current?.nextSet()}
              className="px-4 py-1.5 rounded-full text-xs font-medium min-h-[36px] transition-all duration-200 touch-manipulation text-muted-foreground hover:text-foreground hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
              aria-label="Next set"
            >
              Next ›
            </button>
          </div>
        </header>
      </div>

      <div className={isLandscape ? '' : 'max-w-4xl mx-auto px-4 sm:px-6'}>
        <div className={isLandscape ? '' : 'rounded-2xl border border-white/10 bg-card/40 backdrop-blur-md p-3 sm:p-5 mb-6 sm:mb-8 shadow-card'}>
          <StreamPlayer
            ref={streamPlayerRef}
            onLandscapeChange={handleLandscapeChange}
            isDonor={isDonor}
            onSkipBlocked={handleSkipBlocked}
          />
        </div>
      </div>

      <div className={isLandscape ? 'hidden' : 'max-w-4xl mx-auto px-4 sm:px-6 mb-6 sm:mb-8 pb-safe'}>
        <ChatRoom
          nullifier={nullifier}
          username={username}
          canWrite={canWrite}
          sessionChecked={sessionChecked}
          needsUsername={needsUsername}
          isUpgradingUsername={isUpgradingName}
          onUpgradeUsername={handleUpgradeUsername}
          onVerified={handleVerified}
          messages={messages}
          isLoading={isLoading}
          isConnected={isConnected}
          sendMessage={sendMessage}
        />
      </div>
    </div>
  )
}
