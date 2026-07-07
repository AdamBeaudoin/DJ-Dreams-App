'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DJ_SETS, ROTATION_INTERVAL, getCurrentSetIndex } from '@/lib/domains/playback/playlist'

const MAX_HISTORY = 10

/**
 * Owns which DJ set is playing: the current index, a bounded back-history for
 * "previous", and the time-based rotation. Navigation only moves the index;
 * per-set playback state (progress, errors) is reset by the player view.
 */
export function usePlaylist() {
  const [index, setIndex] = useState(0)
  const historyStack = useRef<number[]>([])

  const goNext = useCallback(() => {
    setIndex(prev => {
      historyStack.current.push(prev)
      if (historyStack.current.length > MAX_HISTORY) historyStack.current.shift()
      return (prev + 1) % DJ_SETS.length
    })
  }, [])

  const goPrevious = useCallback(() => {
    setIndex(prev => {
      if (historyStack.current.length === 0) return prev
      return historyStack.current.pop()!
    })
  }, [])

  useEffect(() => {
    setIndex(getCurrentSetIndex())
    const interval = setInterval(goNext, ROTATION_INTERVAL)
    return () => clearInterval(interval)
  }, [goNext])

  return { index, currentSet: DJ_SETS[index], goNext, goPrevious }
}
