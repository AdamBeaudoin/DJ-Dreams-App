'use client'

import { useEffect, useState } from 'react'

/**
 * Tracks whether the current verified user has donated (unlocks unlimited
 * skips). Refetches whenever the nullifier changes; `markDonor` lets the tip
 * flow flip the flag optimistically after a successful payment.
 */
export function useDonorStatus(nullifier: string | null) {
  const [isDonor, setIsDonor] = useState(false)

  useEffect(() => {
    if (!nullifier) return
    let cancelled = false
    fetch('/api/payments/donor-check')
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.isDonor) setIsDonor(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [nullifier])

  return { isDonor, markDonor: () => setIsDonor(true) }
}
