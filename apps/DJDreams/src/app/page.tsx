'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { StreamPlayer } from '@/components/stream-player'
import { ChatRoom } from '@/components/chat-room'
import { useToast } from '@/components/ui/use-toast'
import { MiniKit, PayCommandInput, Tokens, tokenToDecimals, Network } from '@worldcoin/minikit-js'

export default function HomePage() {
  const [shuffleTrigger, setShuffleTrigger] = useState(0)
  const { toast } = useToast()
  const [isTipping, setIsTipping] = useState(false)

  const handleShuffle = () => {
    setShuffleTrigger(prev => prev + 1)
  }

  const handleTip = async () => {
    const recipient = process.env.NEXT_PUBLIC_TIP_RECIPIENT_ADDRESS || '0x693d8dced3be29222691123656daea9f18e95f4b'
    const amountWld = Number(process.env.NEXT_PUBLIC_TIP_AMOUNT || '1')

    setIsTipping(true)
    
    try {
      if (!MiniKit.isInstalled()) {
        toast({ title: 'Open in World App', description: 'Payments are available in World App.', variant: 'destructive' })
        return
      }

      const initRes = await fetch('/api/initiate-payment', { method: 'POST', cache: 'no-store' })
      const { id: reference } = await initRes.json()

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

      console.log('MiniKit installed?', MiniKit.isInstalled())
      console.log('pay available?', !!MiniKit.commandsAsync?.pay)
      if (!MiniKit.isInstalled() || !MiniKit.commandsAsync?.pay) {
        toast({ title: 'Open in World App', description: 'Please open in the latest World App to pay.', variant: 'destructive' })
        return
      }

      const { finalPayload } = await MiniKit.commandsAsync.pay(payInput)

      if (finalPayload.status === 'error') {
        toast({ title: 'Tip cancelled', description: 'Payment was cancelled.', variant: 'destructive' })
      } else {
        const confirmRes = await fetch('/api/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: finalPayload }),
        })
        const confirmJson = await confirmRes.json()
        if (confirmJson.success) {
          toast({ title: 'Thanks! 💸', description: 'Your tip was sent successfully!' })
        } else {
          toast({ title: 'Tip pending', description: 'We are waiting for confirmation on-chain.' })
        }
      }
    } catch (err) {
      console.error('Tip error:', err)
      toast({ title: 'Tip failed', description: 'Something went wrong. Please try again.', variant: 'destructive' })
    } finally {
      setIsTipping(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-black overflow-hidden">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl">
        <header className="text-center mb-6 sm:mb-8">
          <div className="mb-3 sm:mb-4 flex justify-center">
            <Image 
              src="/DJ-Dreams-Logo.jpg" 
              alt="DJ Dreams Logo" 
              width={280}
              height={96}
              className="h-12 sm:h-16 md:h-20 lg:h-24 w-auto object-contain max-w-[280px] sm:max-w-none"
              onLoad={() => console.log('Logo loaded successfully')}
              onError={(e) => {
                console.log('Logo failed to load, showing fallback text');
                e.currentTarget.style.display = 'none';
                const fallback = document.getElementById('logo-fallback');
                if (fallback) fallback.style.display = 'block';
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
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 px-4">
            DJ sets from around the world
          </p>
          <div className="flex justify-center gap-3 sm:gap-4 flex-wrap">
            <div className="px-4 sm:px-6 py-3 sm:py-2 bg-white/20 text-white rounded-lg text-sm sm:text-base font-medium min-h-[44px] flex items-center border-2 border-white/30">
              🔴 Live
            </div>
            <button 
              onClick={handleTip}
              disabled={isTipping}
              className={`px-4 sm:px-6 py-3 sm:py-2 rounded-lg transition-colors text-sm sm:text-base font-medium min-h-[44px] flex items-center gap-2 touch-manipulation ${!isTipping ? 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30' : 'bg-gray-600/50 text-gray-300 cursor-not-allowed'}`}
            >
              {isTipping ? '⏳ Tipping...' : '💸 Tip'}
            </button>
            <button 
              onClick={handleShuffle}
              className="px-4 sm:px-6 py-3 sm:py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 active:bg-white/30 transition-colors text-sm sm:text-base font-medium min-h-[44px] flex items-center gap-2 touch-manipulation"
            >
              🔀 Shuffle
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-6 mb-6 sm:mb-8">
            <StreamPlayer shuffleTrigger={shuffleTrigger} />
          </div>
          
          <div className="mb-6 sm:mb-8 pb-safe">
            <ChatRoom />
          </div>
        </main>
      </div>
    </div>
  )
} 