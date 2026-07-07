'use client'

import { useCallback, useEffect, useState } from 'react'
import { isFallbackUsername } from '@/lib/domains/identity/username'
import { useWalletAuthUpgrade } from '@/hooks/useWalletAuthUpgrade'

const STORAGE_KEY = 'dj-dreams-session'

function persist(nullifier: string, username: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nullifier, username }))
  } catch {}
}

function clearPersisted() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

/**
 * Server-authoritative session state for the chat. Never hydrates the nullifier
 * from localStorage before the server confirms the cookie — stale localStorage
 * was previously unlocking the input without verification.
 */
export function useSession() {
  const [nullifier, setNullifier] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [sessionChecked, setSessionChecked] = useState(false)
  const [isUpgradingUsername, setIsUpgradingUsername] = useState(false)
  const runWalletAuthUpgradeStep = useWalletAuthUpgrade()

  const canWrite = sessionChecked && nullifier !== null
  const needsUsername = canWrite && isFallbackUsername(username)

  useEffect(() => {
    let cancelled = false

    const reset = () => {
      setNullifier(null)
      setUsername('')
      clearPersisted()
    }

    fetch('/api/identity/session', { method: 'GET' })
      .then(async (res) => {
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          const s = data?.data
          if (s?.nullifier) {
            setNullifier(s.nullifier)
            setUsername(s.username || '')
            persist(s.nullifier, s.username || '')
            return
          }
        }
        reset()
      })
      .catch(() => {
        if (!cancelled) reset()
      })
      .finally(() => {
        if (!cancelled) setSessionChecked(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleVerified = useCallback((n: string, u: string) => {
    setNullifier(n)
    setUsername(u)
    setSessionChecked(true)
    persist(n, u)
  }, [])

  // Recover a real World App username for a session still on the fallback name.
  // Button-driven (never auto-prompts) so the user always has an explicit
  // sign-in affordance and is never silently stuck.
  const handleUpgradeUsername = useCallback(async () => {
    if (!nullifier || isUpgradingUsername) return
    setIsUpgradingUsername(true)
    try {
      const result = await runWalletAuthUpgradeStep(nullifier, { context: 'connect' })
      if (result.status === 'ok' && result.username) {
        setUsername(result.username)
        persist(nullifier, result.username)
      }
    } finally {
      setIsUpgradingUsername(false)
    }
  }, [nullifier, isUpgradingUsername, runWalletAuthUpgradeStep])

  return {
    nullifier,
    username,
    sessionChecked,
    canWrite,
    needsUsername,
    isUpgradingUsername,
    handleVerified,
    handleUpgradeUsername,
  }
}
