'use client'

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, memo } from 'react'
import dynamic from 'next/dynamic'
import { DJ_SETS, ROTATION_INTERVAL, getCurrentSetIndex } from '@/lib/domains/playback/playlist'
import { canSkip, incrementSkipCount } from '@/lib/skip-counter'

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

const SWIPE_THRESHOLD = 60
const MAX_HISTORY = 10
const CONTROLS_TIMEOUT = 3000

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
  const [streamError, setStreamError] = useState(false)
  const [currentSetIndex, setCurrentSetIndex] = useState(0)
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

  // Landscape fullscreen state
  const [isLandscape, setIsLandscape] = useState(false)
  const [forcePortrait, setForcePortrait] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Swipe state
  const historyStack = useRef<number[]>([])
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const effectiveLandscape = isLandscape && !forcePortrait

  // --- Imperative handle ---

  // --- Navigation ---

  const goToNextSet = useCallback(() => {
    setCurrentSetIndex(prev => {
      historyStack.current.push(prev)
      if (historyStack.current.length > MAX_HISTORY) historyStack.current.shift()
      return (prev + 1) % DJ_SETS.length
    })
    setStreamError(false)
    setIsTransitioning(false)
    setPlayed(0)
    displayedPercentRef.current = 0
  }, [])

  const goToPreviousSet = useCallback(() => {
    if (historyStack.current.length === 0) return
    const prevIndex = historyStack.current.pop()!
    setCurrentSetIndex(prevIndex)
    setStreamError(false)
    setIsTransitioning(false)
    setPlayed(0)
    displayedPercentRef.current = 0
  }, [])

  useImperativeHandle(ref, () => ({
    exitFullscreen() {
      setForcePortrait(true)
      setShowControls(false)
    },
    nextSet: goToNextSet,
    previousSet: goToPreviousSet,
  }), [goToNextSet, goToPreviousSet])

  // --- Orientation detection ---

  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape)')
    const handler = (e: MediaQueryListEvent) => {
      setIsLandscape(e.matches)
      setForcePortrait(false)
    }
    setIsLandscape(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    onLandscapeChange?.(effectiveLandscape)
  }, [effectiveLandscape, onLandscapeChange])

  // --- Landscape controls overlay ---

  const handlePlayerTap = useCallback(() => {
    if (!effectiveLandscape) return
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), CONTROLS_TIMEOUT)
  }, [effectiveLandscape])

  const handleExitFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setForcePortrait(true)
    setShowControls(false)
  }, [])

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [])

  // --- Swipe handling ---

  const isSwiping = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isSwiping.current = false
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current)
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (deltaX > 10 && deltaX > deltaY) {
      isSwiping.current = true
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current

    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
      if (deltaX < 0) {
        if (!canSkip(isDonor)) {
          onSkipBlocked?.()
          return
        }
        incrementSkipCount()
        goToNextSet()
      } else {
        if (!isDonor) {
          onSkipBlocked?.()
          return
        }
        goToPreviousSet()
      }
    }
  }, [goToNextSet, goToPreviousSet, isDonor, onSkipBlocked])

  // --- Playback lifecycle ---

  useEffect(() => {
    setCurrentSetIndex(getCurrentSetIndex())
    const interval = setInterval(goToNextSet, ROTATION_INTERVAL)
    return () => clearInterval(interval)
  }, [goToNextSet])

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
        transitionTimeoutRef.current = setTimeout(goToNextSet, 1000)
      }
    }
  }, [duration, isTransitioning, goToNextSet])

  const handleDuration = useCallback((d: number) => {
    setDuration(d)
  }, [])

  const handleEnded = useCallback(() => {
    if (!isTransitioning) {
      goToNextSet()
    }
  }, [isTransitioning, goToNextSet])

  const handleError = useCallback((error: unknown) => {
    console.log('Stream error:', error)
    setStreamError(true)
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    errorTimeoutRef.current = setTimeout(goToNextSet, 3000)
  }, [goToNextSet])

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
          key={currentSetIndex}
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
                {DJ_SETS[currentSetIndex].title}
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
