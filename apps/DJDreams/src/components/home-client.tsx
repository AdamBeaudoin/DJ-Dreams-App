'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { StreamPlayer, type StreamPlayerHandle } from '@/components/stream-player'
import { ChatSection } from '@/components/chat-section'
import { Button } from '@/components/ui/button'
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
            <Button
              variant="ghost"
              onClick={() => streamPlayerRef.current?.previousSet()}
              className="rounded-full min-h-[44px] px-4 text-xs font-medium text-muted-foreground touch-manipulation"
              aria-label="Previous set"
            >
              ‹ Prev
            </Button>
            <Button
              variant="pill-primary"
              onClick={tip}
              disabled={isTipping}
              className="px-5 text-xs font-semibold"
            >
              {isTipping ? 'Sending…' : 'Tip the builder'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => streamPlayerRef.current?.nextSet()}
              className="rounded-full min-h-[44px] px-4 text-xs font-medium text-muted-foreground touch-manipulation"
              aria-label="Next set"
            >
              Next ›
            </Button>
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
