import { useState, useEffect } from 'react'

export function useAnalytics() {
  const [viewerCount, setViewerCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simple random viewer count between 20-70
    const randomCount = Math.floor(Math.random() * 50) + 20
    setViewerCount(randomCount)
    setIsLoading(false)

    // Simulate slight fluctuations every 30 seconds
    const interval = setInterval(() => {
      setViewerCount(prev => {
        const change = Math.floor(Math.random() * 6) - 3 // -3 to +3
        return Math.max(15, Math.min(75, prev + change))
      })
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const updateVerification = async (worldId: string) => {
    // Simple mock verification
    console.log('Mock verification for:', worldId)
    return { success: true, user_id: worldId }
  }

  return { viewerCount, updateVerification }
} 