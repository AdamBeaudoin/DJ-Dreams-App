'use client'

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, memo } from 'react'
import dynamic from 'next/dynamic'
import { usePlaylist } from '@/hooks/usePlaylist'
import { useLandscapeSwipe } from '@/hooks/useLandscapeSwipe'

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

const PLAYER_CONFIG = {
  playerVars: {
    autoplay: 1,
    rel: 0,
    showinfo: 0,
    modestbranding: 1,
  },
} as const

interface StreamPlayerProps {
  onLandscapeChange?: (isLandscape: boolean) => void
  isDonor?: boolean
  onSkipBlocked?: () => void
}

export interface StreamPlayerHandle {
  exitFullscreen: () => void
  nextSet: () => void
  previousSet: () => void
}

const StreamPlayerImpl = forwardRef<StreamPlayerHandle, StreamPlayerProps>(
  function StreamPlayer({ onLandscapeChange, isDonor = false, onSkipBlocked }, ref) {
  const { index, currentSet, goNext, goPrevious } = usePlaylist()
  const {
    effectiveLandscape,
    showControls,
    exitFullscreen,
    handlePlayerTap,
    handleExitFullscreen,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useLandscapeSwipe({ isDonor, onSkipBlocked, goNext, goPrevious })

  // Per-set player-view state. Reset whenever the playlist index changes.
  const [streamError, setStreamError] = useState(false)
  const [duration, setDuration] = useState(0)
  const [played, setPlayed] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Timers that advance/recover the track — held in refs so they can be cleared
  // (previously stacked/leaked on every transition and error).
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Last whole-percent pushed to state; gates setPlayed so we re-render at most
  // once per 1% instead of on every progress tick.
  const displayedPercentRef = useRef(0)

  const containerRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    exitFullscreen,
    nextSet: goNext,
    previousSet: goPrevious,
  }), [exitFullscreen, goNext, goPrevious])

  useEffect(() => {
    onLandscapeChange?.(effectiveLandscape)
  }, [effectiveLandscape, onLandscapeChange])

  // Reset per-set view state whenever the active set changes.
  useEffect(() => {
    setStreamError(false)
    setPlayed(0)
    setIsTransitioning(false)
    displayedPercentRef.current = 0
  }, [index])

  // Clear any pending advance/recover timers on unmount.
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    }
  }, [])

  const handleProgress = useCallback((state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    const pct = Math.round(state.played * 100)
    if (pct !== displayedPercentRef.current) {
      displayedPercentRef.current = pct
      setPlayed(state.played)
    }

    if (duration > 0 && !isTransitioning) {
      const remainingTime = duration - state.playedSeconds

      if (remainingTime <= 10 || state.played >= 0.98) {
        setIsTransitioning(true)
        if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
        transitionTimeoutRef.current = setTimeout(goNext, 1000)
      }
    }
  }, [duration, isTransitioning, goNext])

  const handleDuration = useCallback((d: number) => {
    setDuration(d)
  }, [])

  const handleEnded = useCallback(() => {
    if (!isTransitioning) {
      goNext()
    }
  }, [isTransitioning, goNext])

  const handleError = useCallback((error: unknown) => {
    console.log('Stream error:', error)
    setStreamError(true)
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    errorTimeoutRef.current = setTimeout(goNext, 3000)
  }, [goNext])

  const handleReady = useCallback(() => {
    setStreamError(false)
  }, [])

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
    <div className={effectiveLandscape ? 'fixed inset-0 z-50 bg-black' : 'w-full max-w-4xl mx-auto'}>
      <div
        ref={containerRef}
        className={effectiveLandscape
          ? 'relative w-full h-full'
          : 'relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl'
        }
        onClick={handlePlayerTap}
      >
        <ReactPlayer
          url={currentSet.url}
          width="100%"
          height="100%"
          playing={true}
          controls={true}
          onProgress={handleProgress}
          onDuration={handleDuration}
          onEnded={handleEnded}
          onError={handleError}
          onReady={handleReady}
          key={index}
          progressInterval={1000}
          config={PLAYER_CONFIG}
        />

        {/* Swipe detection zone — bottom strip only, so play button in center is not blocked */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 z-[5]"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />


        {isTransitioning && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
            <div className="text-white text-center">
              <div className="text-lg mb-2">Switching to next set...</div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            </div>
          </div>
        )}

        {/* Landscape close button overlay */}
        {effectiveLandscape && showControls && (
          <div className="absolute inset-0 bg-black/30 z-30 landscape-overlay-fade">
            <button
              onClick={handleExitFullscreen}
              className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
              aria-label="Exit fullscreen"
            >
              ✕
            </button>
          </div>
        )}

        {/* Bottom info bar */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4 z-10"
        >
          <div className="flex items-center justify-between text-white">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-lg font-semibold mb-1 truncate">
                {currentSet.title}
              </h3>
              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-300">
                <span className="flex items-center gap-1">
                  {Math.round(played * 100)}%
                  <span className="hidden sm:inline">played</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export const StreamPlayer = memo(StreamPlayerImpl)
