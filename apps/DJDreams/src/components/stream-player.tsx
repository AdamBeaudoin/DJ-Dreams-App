'use client'

import { useState, useEffect, useRef } from 'react'
import ReactPlayer from 'react-player/youtube'
import { useAnalytics } from '@/hooks/use-analytics'

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
  }
]

// Rotation interval in milliseconds (2 hours)
const ROTATION_INTERVAL = 2 * 60 * 60 * 1000

interface StreamPlayerProps {
  shuffleTrigger?: number
}

export function StreamPlayer({ shuffleTrigger = 0 }: StreamPlayerProps) {
  const [isClient, setIsClient] = useState(false)
  const [streamError, setStreamError] = useState(false)
  const [currentSetIndex, setCurrentSetIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [played, setPlayed] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const playerRef = useRef<ReactPlayer>(null)
  const { viewerCount } = useAnalytics()

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
    setIsClient(true)
    
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

  const handleError = () => {
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
  }

  if (!isClient) {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-white text-lg">Loading live stream...</div>
      </div>
    )
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
            <p className="text-white text-xl animate-pulse">Loading next set...</p>
          </div>
        )}

        {/* Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-1.5 mb-2">
            <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${played * 100}%` }}></div>
          </div>
          
          {/* Now Playing / Viewers / Up Next */}
          <div className="flex justify-between items-end text-white">
            {/* Now Playing */}
            <div className="w-1/3">
              <p className="text-xs text-gray-400">Now Playing</p>
              <h2 className="text-sm font-bold truncate">{DJ_SETS[currentSetIndex].title}</h2>
            </div>

            {/* Viewer Count */}
            <div className="text-center">
              <div className="text-xs flex items-center justify-center gap-1.5 bg-black/50 px-2 py-0.5 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                {viewerCount.toLocaleString()} watching
              </div>
            </div>

            {/* Up Next */}
            <div className="w-1/3 text-right">
              <p className="text-xs text-gray-400">Up Next</p>
              <h3 className="text-sm font-light truncate text-gray-300">{DJ_SETS[(currentSetIndex + 1) % DJ_SETS.length].title}</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 