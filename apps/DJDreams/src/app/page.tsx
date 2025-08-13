'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { StreamPlayer } from '@/components/stream-player'
import { ChatRoom } from '@/components/chat-room'
import { useToast } from '@/components/ui/use-toast'
import { MiniKit } from '@worldcoin/minikit-js'

// Minimal ERC-20 ABI for transfer
const ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

export default function HomePage() {
  const [shuffleTrigger, setShuffleTrigger] = useState(0)
  const { toast } = useToast()
  const [isWorldApp, setIsWorldApp] = useState(false)

  const handleShuffle = () => {
    setShuffleTrigger(prev => prev + 1)
  }

  useEffect(() => {
    try {
      const installed = MiniKit.isInstalled()
      setIsWorldApp(!!installed)
    } catch (e) {
      setIsWorldApp(false)
    }
  }, [])

  const handleTip = async () => {
    const recipient = process.env.NEXT_PUBLIC_TIP_RECIPIENT_ADDRESS || '0x693d8dced3be29222691123656daea9f18e95f4b'
    const tokenAddress = process.env.NEXT_PUBLIC_TIP_WLD_ADDRESS || '0x163f8c2467924be0ae7b5347228cabf260318753'
    const amountWld = Number(process.env.NEXT_PUBLIC_TIP_AMOUNT || '1')

    if (!isWorldApp) return

    const confirmed = typeof window !== 'undefined' ? window.confirm('Tip 1 WLD via World App?') : false
    if (!confirmed) return

    try {
      // 1 WLD with 18 decimals
      const amountWei = BigInt(Math.floor(amountWld * 1e18)).toString()

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: tokenAddress,
            abi: ERC20_ABI as any,
            functionName: 'transfer',
            args: [recipient, amountWei],
          },
        ],
      })

      if ((finalPayload as any).status === 'error') {
        toast({ title: 'Tip failed', description: 'Transaction was cancelled or failed.', variant: 'destructive' })
      } else {
        toast({ title: 'Thanks! 💸', description: 'Tip submitted in World App.' })
      }
    } catch (err) {
      toast({ title: 'Tip failed', description: 'Unexpected error. Please try again.', variant: 'destructive' })
      console.error('Tip error', err)
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
            <div className="flex items-center gap-2">
              <button 
                onClick={handleTip}
                disabled={!isWorldApp}
                title={isWorldApp ? 'Tip 1 WLD' : 'Open in World App to tip'}
                className={`px-4 sm:px-6 py-3 sm:py-2 rounded-lg transition-colors text-sm sm:text-base font-medium min-h-[44px] flex items-center gap-2 touch-manipulation ${isWorldApp ? 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30' : 'bg-gray-700/50 text-gray-300 cursor-not-allowed'}`}
              >
                💸 Tip
              </button>
            </div>
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