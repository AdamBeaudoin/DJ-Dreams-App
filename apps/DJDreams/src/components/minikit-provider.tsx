'use client'

import { type ReactNode, useEffect } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'

export function MiniKitProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Only install MiniKit if we're in a browser environment
    if (typeof window !== 'undefined') {
      try {
        const appId = process.env.NEXT_PUBLIC_APP_ID as `app_${string}` | undefined
        if (appId) {
          MiniKit.install(appId)
        } else {
          MiniKit.install()
        }
      } catch (error) {
        console.log('MiniKit installation skipped:', error)
      }
    }
  }, [])

  return <>{children}</>
} 