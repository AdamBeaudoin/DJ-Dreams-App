'use client'

import { useState } from 'react'
import Image from 'next/image'
import { StreamPlayer } from '@/components/stream-player'
import { ChatRoom } from '@/components/chat-room'
import { useAnalytics } from '@/hooks/use-analytics'

export default function HomePage() {
  const [shuffleTrigger, setShuffleTrigger] = useState(0)
  const { trackEvent } = useAnalytics()

  const handleShuffle = () => {
    setShuffleTrigger(prev => prev + 1)
    
    // Track shuffle button click
    trackEvent('shuffle_button_clicked', {
      trigger_count: shuffleTrigger + 1,
      timestamp: new Date().toISOString()
    })
  }

  return (
    <div className="min-h-screen bg-black">
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