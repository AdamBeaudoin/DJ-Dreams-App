'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import ReactPlayer to ensure it only loads on client-side
const ReactPlayer = dynamic(() => import('react-player/youtube'), {
  ssr: false,
  loading: () => (
    <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
      <div className="text-center text-white">
        <div className="text-lg mb-2">Loading live stream...</div>
        <div className="text-sm text-gray-400">Initializing player...</div>
      </div>
    </div>
  )
})

const DJ_SETS = [
  {
    url: 'https://www.youtube.com/watch?v=-thQ8NNWtFE',
    title: 'Romy | Boiler Room: London',
  },
  {
    url: 'https://www.youtube.com/watch?v=328JXdl4Ix4',
    title: 'SEVEN - Carmen Electro | HÖR'
  },
  {
    url: 'https://www.youtube.com/watch?v=Q7ijWa9T21M',
    title: 'CRYME | HÖR'
  },
  {
    url: 'https://www.youtube.com/watch?v=cGPuGUlSXJA',
    title: 'Bambi-S | HÖR'
  },
  {
    url: 'https://www.youtube.com/watch?v=c0-hvjV2A5Y',
    title: 'Fred again.. | Boiler Room: London'
  },
  {
    url: 'https://www.youtube.com/watch?v=YA1FGanQA_E',
    title: 'KI/KI - BBC Radio 1 Essential Mix House Party'
  },
  {
    url: 'https://www.youtube.com/watch?v=C_u9kRVjR_A',
    title: 'SEVEN - CRYME | HÖR'
  },
  {
    url: 'https://www.youtube.com/watch?v=ybN2pf3B57c',
    title: 'Fred Again & Skepta - Victory Lap'
  },
  {
    url: 'https://www.youtube.com/watch?v=xgJBhezlMoE',
    title: 'Overmono | Boiler Room'
  },
  {
    url: 'https://www.youtube.com/watch?v=-w3xYI64LSo',
    title: 'Job Jobse | Boiler Room'
  },
  {
    url: 'https://www.youtube.com/watch?v=5c9QuIMOcwc',
    title: 'Flat White'
  },
  {
    url: 'https://www.youtube.com/watch?v=7Ih2hbcZZoM',
    title: 'Dekmantel - Shanti Celeste & Peach'
  },
  {
    url: 'https://www.youtube.com/watch?v=pOTkCgkxqyg',
    title: 'Nirvana - MTV Unplugged in New York'
  },
  {
    url: 'https://www.youtube.com/watch?v=YIFwo6lKDhI',
    title: 'Job Jobse: Streaming from Isolation'
  }
]

// Rotation interval in milliseconds (2 hours)
const ROTATION_INTERVAL = 2 * 60 * 60 * 1000

interface StreamPlayerProps {
  shuffleTrigger?: number
}

export function StreamPlayer({ shuffleTrigger = 0 }: StreamPlayerProps) {
  const [streamError, setStreamError] = useState(false)
  const [currentSetIndex, setCurrentSetIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [played, setPlayed] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const playerRef = useRef<any>(null)

  // Handle manual shuffle
  useEffect(() => {
    if (shuffleTrigger > 0) {
      setCurrentSetIndex(prev => (prev + 1) % DJ_SETS.length)
      setStreamError(false)
      setIsTransitioning(false)
      setPlayed(0)
    }
  }, [shuffleTrigger])

  useEffect(() => {
    // Calculate which set should be playing based on time
    const now = Date.now()
    const startTime = new Date('2025-01-01').getTime()
    const elapsed = now - startTime
    const currentIndex = Math.floor(elapsed / ROTATION_INTERVAL) % DJ_SETS.length
    setCurrentSetIndex(currentIndex)

    // Set up interval to rotate sets (backup for long videos)
    const interval = setInterval(() => {
      setCurrentSetIndex(prev => (prev + 1) % DJ_SETS.length)
      setStreamError(false)
      setIsTransitioning(false)
      setPlayed(0)
    }, ROTATION_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    setPlayed(state.played)
    
    // Switch to next video when 10 seconds remaining or 98% played
    if (duration > 0 && !isTransitioning) {
      const remainingTime = duration - state.playedSeconds
      const playedPercentage = state.played
      
      if (remainingTime <= 10 || playedPercentage >= 0.98) {
        setIsTransitioning(true)
        setTimeout(() => {
          setCurrentSetIndex(prev => (prev + 1) % DJ_SETS.length)
          setStreamError(false)
          setIsTransitioning(false)
          setPlayed(0)
        }, 1000) // Small delay for smooth transition
      }
    }
  }

  const handleDuration = (duration: number) => {
    setDuration(duration)
  }

  const handleEnded = () => {
    // Fallback: if video ends naturally, switch to next
    if (!isTransitioning) {
      setCurrentSetIndex(prev => (prev + 1) % DJ_SETS.length)
      setStreamError(false)
      setPlayed(0)
    }
  }

  const handleError = (error: any) => {
    console.log('Stream error:', error)
    setStreamError(true)
    // Auto-recover by switching to next video after 3 seconds
    setTimeout(() => {
      setCurrentSetIndex(prev => (prev + 1) % DJ_SETS.length)
      setStreamError(false)
      setPlayed(0)
    }, 3000)
  }

  const handleReady = () => {
    setIsPlaying(true)
    setStreamError(false)
  }

  if (streamError) {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-lg mb-2">Stream temporarily offline</div>
          <div className="text-sm text-gray-400">
            Switching to next set...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
        {/* Player */}
        <ReactPlayer
          ref={playerRef}
          url={DJ_SETS[currentSetIndex].url}
          width="100%"
          height="100%"
          playing={true}
          controls={true}
          onProgress={handleProgress}
          onDuration={handleDuration}
          onEnded={handleEnded}
          onError={handleError}
          onReady={handleReady}
          key={`${currentSetIndex}-${shuffleTrigger}`}
          config={{
            playerVars: {
              autoplay: 1,
              rel: 0,
              showinfo: 0,
              modestbranding: 1
            }
          }}
        />

        {/* Transition indicator */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
            <div className="text-white text-center">
              <div className="text-lg mb-2">Switching to next set...</div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            </div>
          </div>
        )}

        {/* Now Playing Info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-lg font-semibold mb-1 truncate">
                {DJ_SETS[currentSetIndex].title}
              </h3>
              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-300">
                <span className="flex items-center gap-1">
                  ⏱️ {Math.round(played * 100)}%
                  <span className="hidden sm:inline">played</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 