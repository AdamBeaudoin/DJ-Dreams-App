'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { StreamPlayer, type StreamPlayerHandle } from '@/components/stream-player'
import { ChatRoom } from '@/components/chat-room'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'
import type { PayCommandInput } from '@worldcoin/minikit-js'

const STORAGE_KEY = 'dj-dreams-session'

export default function HomePage() {
  const [isTipping, setIsTipping] = useState(false)
  const [nullifier, setNullifier] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [isLandscape, setIsLandscape] = useState(false)
  const [isDonor, setIsDonor] = useState(false)
  const [isBoostMode, setIsBoostMode] = useState(false)
  const [isBoosting, setIsBoosting] = useState(false)
  const { toast } = useToast()

  const streamPlayerRef = useRef<StreamPlayerHandle>(null)
  const { messages, isLoading, isConnected, sendMessage } = useRealtimeChat()

  const handleLandscapeChange = useCallback((landscape: boolean) => {
    setIsLandscape(landscape)
  }, [])

  const handleMiniChatTap = useCallback(() => {
    if (isLandscape) {
      streamPlayerRef.current?.exitFullscreen()
      setTimeout(() => {
        document.getElementById('chat-room')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } else {
      document.getElementById('chat-room')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isLandscape])

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const { nullifier: n, username: u } = JSON.parse(stored)
        if (n) {
          setNullifier(n)
          setUsername(u || '')
        }
      }
    } catch {}
  }, [])

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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nullifier: n, username: u }))
    } catch {}
  }

  // --- Shared payment flow ---
  const runPaymentFlow = async (purpose: 'tip' | 'boost'): Promise<boolean> => {
    if (!nullifier) {
      toast({ title: 'Verify first', description: 'Please verify with World ID.', variant: 'destructive' })
      return false
    }

    const recipient = process.env.NEXT_PUBLIC_TIP_RECIPIENT_ADDRESS || '0x693d8dced3be29222691123656daea9f18e95f4b'
    const amountWld = Number(process.env.NEXT_PUBLIC_TIP_AMOUNT || '1')

    try {
      const { MiniKit, Tokens, tokenToDecimals, Network } = await import('@worldcoin/minikit-js')

      if (!MiniKit.isInstalled()) {
        toast({ title: 'Open in World App', description: 'Payments are available in World App.', variant: 'destructive' })
        return false
      }

      const initRes = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose }),
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
        description: purpose === 'boost' ? 'Boost a message in DJ Dreams' : 'Tip for DJ Dreams',
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
      const success = await runPaymentFlow('tip')
      if (success) {
        toast({ title: 'Thanks!', description: 'Your tip was sent successfully!' })
      }
    } finally {
      setIsTipping(false)
    }
  }, [nullifier, toast])

  // --- Boost ---
  const handleBoost = async () => {
    if (!nullifier) {
      toast({ title: 'Verify first', description: 'Please verify with World ID to boost.', variant: 'destructive' })
      return
    }
    setIsBoosting(true)
    try {
      const success = await runPaymentFlow('boost')
      if (success) {
        setIsBoostMode(true)
        toast({ title: 'Boost ready!', description: 'Type your boosted message.' })
      }
    } finally {
      setIsBoosting(false)
    }
  }

  const handleSkipBlocked = useCallback(() => {
    toast({
      title: 'Skip limit reached',
      description: 'Donate to get unlimited skips',
      action: <ToastAction altText="Donate" onClick={handleTip}>Donate</ToastAction>,
    })
  }, [toast, handleTip])

  return (
    <div className="min-h-[100dvh] bg-black overflow-hidden">
      <div className={isLandscape ? 'hidden' : 'container mx-auto px-3 sm:px-4 py-2 sm:py-4 max-w-5xl'}>
        <header className="text-center mb-3 sm:mb-4">
          <div className="mb-1 sm:mb-2 flex justify-center">
            <Image
              src="/DJ-Dreams-Logo.jpg"
              alt="DJ Dreams Logo"
              width={280}
              height={96}
              className="h-12 sm:h-16 md:h-20 lg:h-24 w-auto object-contain max-w-[280px] sm:max-w-none"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const fallback = document.getElementById('logo-fallback')
                if (fallback) fallback.style.display = 'block'
              }}
              priority
            />
            <h1
              id="logo-fallback"
              className="text-3xl sm:text-4xl md:text-6xl font-bold text-cyan-400 mb-4 tracking-tight hidden"
              style={{fontFamily: 'serif'}}
            >
              DJ Dreams
            </h1>
          </div>
          <p
            className="text-[10px] sm:text-xs md:text-sm text-cyan-300/70 mb-3 sm:mb-4 px-4 uppercase tracking-[0.25em] font-light"
            style={{ fontFamily: 'serif' }}
          >
            DJ sets from around the world
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => streamPlayerRef.current?.previousSet()}
              className="px-3 py-1.5 rounded-full text-xs font-medium min-h-[36px] transition-all touch-manipulation text-white/40 hover:text-white/70 active:text-white"
              aria-label="Previous set"
            >
              ‹ Prev
            </button>
            <button
              onClick={handleTip}
              disabled={isTipping}
              className={`px-4 py-1.5 rounded-full text-xs font-medium min-h-[36px] transition-all touch-manipulation ${!isTipping ? 'bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20 active:bg-cyan-400/30 border border-cyan-400/30' : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'}`}
            >
              {isTipping ? 'Sending...' : 'Tip the DJ'}
            </button>
            <button
              onClick={() => streamPlayerRef.current?.nextSet()}
              className="px-3 py-1.5 rounded-full text-xs font-medium min-h-[36px] transition-all touch-manipulation text-white/40 hover:text-white/70 active:text-white"
              aria-label="Next set"
            >
              Next ›
            </button>
          </div>
        </header>
      </div>

      <div className={isLandscape ? '' : 'max-w-4xl mx-auto px-3 sm:px-4'}>
        <div className={isLandscape ? '' : 'bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-6 mb-6 sm:mb-8'}>
          <StreamPlayer
            ref={streamPlayerRef}
            onLandscapeChange={handleLandscapeChange}
            messages={messages}
            onMiniChatTap={handleMiniChatTap}
            isDonor={isDonor}
            onSkipBlocked={handleSkipBlocked}
          />
        </div>
      </div>

      <div className={isLandscape ? 'hidden' : 'max-w-4xl mx-auto px-3 sm:px-4 mb-6 sm:mb-8 pb-safe'}>
        <ChatRoom
          nullifier={nullifier}
          username={username}
          onVerified={handleVerified}
          messages={messages}
          isLoading={isLoading}
          isConnected={isConnected}
          sendMessage={sendMessage}
          isBoostMode={isBoostMode}
          onBoost={handleBoost}
          isBoosting={isBoosting}
          onBoostMessageSent={() => setIsBoostMode(false)}
        />
      </div>
    </div>
  )
}
