'use client'

import { type ReactNode, useEffect } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'

export function MiniKitProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Only install MiniKit if we're in a browser environment
    if (typeof window !== 'undefined') {
      try {
        MiniKit.install()
      } catch (error) {
        console.log('MiniKit installation skipped:', error)
      }
    }
  }, [])

  return <>{children}</>
} 