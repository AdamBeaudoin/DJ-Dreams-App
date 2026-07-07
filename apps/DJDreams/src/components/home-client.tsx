'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { StreamPlayer, type StreamPlayerHandle } from '@/components/stream-player'
import { ChatSection } from '@/components/chat-section'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { useSession } from '@/hooks/useSession'
import { useDonorStatus } from '@/hooks/useDonorStatus'
import { useTipFlow } from '@/hooks/useTipFlow'

interface HomeClientProps {
  /** Server-rendered brand block (logo + tagline). */
  brand: ReactNode
}

export function HomeClient({ brand }: HomeClientProps) {
  const [isLandscape, setIsLandscape] = useState(false)
  const { toast } = useToast()

  const {
    nullifier,
    username,
    sessionChecked,
    canWrite,
    needsUsername,
    isUpgradingUsername,
    handleVerified,
    handleUpgradeUsername,
  } = useSession()
  const { isDonor, markDonor } = useDonorStatus(nullifier)
  const { isTipping, tip } = useTipFlow({ nullifier, onDonor: markDonor })

  const streamPlayerRef = useRef<StreamPlayerHandle>(null)

  const handleLandscapeChange = useCallback((landscape: boolean) => {
    setIsLandscape(landscape)
  }, [])

  const handleSkipBlocked = useCallback(() => {
    toast({
      title: 'Skip limit reached',
      description: 'Donate to get unlimited skips',
      action: <ToastAction altText="Donate" onClick={tip}>Donate</ToastAction>,
    })
  }, [toast, tip])

  return (
    <div className="min-h-[100dvh] bg-background overflow-hidden pt-safe">
      <div className={isLandscape ? 'hidden' : 'container mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-2 max-w-4xl'}>
        <header className="text-center mb-5 sm:mb-6">
          {brand}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={() => streamPlayerRef.current?.previousSet()}
              className="px-4 py-1.5 rounded-full text-xs font-medium min-h-[44px] transition-all duration-200 touch-manipulation text-muted-foreground hover:text-foreground hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
              aria-label="Previous set"
            >
              ‹ Prev
            </button>
            <button
              onClick={tip}
              disabled={isTipping}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold min-h-[44px] transition-all duration-200 touch-manipulation focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] ${
                !isTipping
                  ? 'bg-primary/15 text-primary hover:bg-primary/25 hover:shadow-glow border border-primary/30'
                  : 'bg-muted text-muted-foreground cursor-not-allowed border border-transparent'
              }`}
            >
              {isTipping ? 'Sending…' : 'Tip the builder'}
            </button>
            <button
              onClick={() => streamPlayerRef.current?.nextSet()}
              className="px-4 py-1.5 rounded-full text-xs font-medium min-h-[44px] transition-all duration-200 touch-manipulation text-muted-foreground hover:text-foreground hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
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
        <ChatSection
          nullifier={nullifier}
          username={username}
          canWrite={canWrite}
          sessionChecked={sessionChecked}
          needsUsername={needsUsername}
          isUpgradingUsername={isUpgradingUsername}
          onUpgradeUsername={handleUpgradeUsername}
          onVerified={handleVerified}
        />
      </div>
    </div>
  )
}
