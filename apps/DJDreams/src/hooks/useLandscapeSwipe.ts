'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import { canSkip, incrementSkipCount } from '@/lib/skip-counter'

const SWIPE_THRESHOLD = 60
const CONTROLS_TIMEOUT = 3000

interface UseLandscapeSwipeParams {
  isDonor: boolean
  onSkipBlocked?: () => void
  goNext: () => void
  goPrevious: () => void
}

/**
 * Orientation-driven fullscreen + horizontal swipe navigation for the player.
 * Left swipe = next (gated by skip limit), right swipe = previous (donors only).
 * Also manages the tap-to-reveal landscape controls overlay.
 */
export function useLandscapeSwipe({ isDonor, onSkipBlocked, goNext, goPrevious }: UseLandscapeSwipeParams) {
  const [isLandscape, setIsLandscape] = useState(false)
  const [forcePortrait, setForcePortrait] = useState(false)
  const [showControls, setShowControls] = useState(false)

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isSwiping = useRef(false)

  const effectiveLandscape = isLandscape && !forcePortrait

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
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [])

  const handlePlayerTap = useCallback(() => {
    if (!effectiveLandscape) return
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), CONTROLS_TIMEOUT)
  }, [effectiveLandscape])

  const exitFullscreen = useCallback(() => {
    setForcePortrait(true)
    setShowControls(false)
  }, [])

  const handleExitFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    exitFullscreen()
  }, [exitFullscreen])

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
        goNext()
      } else {
        if (!isDonor) {
          onSkipBlocked?.()
          return
        }
        goPrevious()
      }
    }
  }, [goNext, goPrevious, isDonor, onSkipBlocked])

  return {
    effectiveLandscape,
    showControls,
    exitFullscreen,
    handlePlayerTap,
    handleExitFullscreen,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
