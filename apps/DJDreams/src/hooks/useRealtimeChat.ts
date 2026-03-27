import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChatMessage } from '@/lib/domains/chat/types'
import { useToast } from '@/components/ui/use-toast'

const isDevelopment = process.env.NODE_ENV === 'development'
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'

// In dev (polling is primary), poll frequently. In prod (real-time handles it), poll rarely as fallback.
const MIN_FETCH_INTERVAL = isDevelopment || isLocalhost ? 10_000 : 5 * 60_000

export function useRealtimeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const lastFetchTimeRef = useRef(0)
  const donorUserIdsRef = useRef<Set<string>>(new Set())
  const { toast } = useToast()

  const MAX_RECONNECT_ATTEMPTS = 3

  const fetchMessages = useCallback(async (force = false) => {
    const now = Date.now()

    if (!force && now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL) {
      return
    }

    try {
      lastFetchTimeRef.current = now
      const response = await fetch('/api/chat/messages?limit=50')
      const data = await response.json()

      if (response.ok) {
        const msgs: ChatMessage[] = data.data?.messages || []
        // Update donor set from server-enriched messages
        const newDonors = new Set<string>()
        msgs.forEach(m => { if (m.is_donor) newDonors.add(m.user_id) })
        donorUserIdsRef.current = newDonors
        setMessages(msgs)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const sendMessage = useCallback(async (
    message: string,
    _nullifier: string,
    username: string,
    is_boosted?: boolean
  ) => {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, ...(is_boosted && { is_boosted: true }) }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send message')
    }

    if (data.data?.moderated) {
      toast({
        title: "Message Moderated",
        description: "Your message contained inappropriate content and was filtered",
        variant: "destructive",
      })
    }

    // Optimistic local insert — append the server-returned message immediately
    if (data.data?.message) {
      setMessages(prev => {
        if (prev.some(msg => msg.id === data.data.message.id)) return prev
        return [...prev, data.data.message]
      })
    }

    return data.data?.message
  }, [toast])

  const setupRealtimeSubscription = useCallback(() => {
    if (isDevelopment || isLocalhost || !supabase) {
      setIsConnected(false)
      return
    }

    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setIsConnected(false)
      return
    }

    const channel = supabase
      .channel('messages')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          newMessage.is_donor = donorUserIdsRef.current.has(newMessage.user_id)

          setMessages(prev => {
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          reconnectAttemptsRef.current = 0
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current += 1
            const delay = Math.min(30000 * Math.pow(2, reconnectAttemptsRef.current), 120000)
            reconnectTimeoutRef.current = setTimeout(() => {
              setupRealtimeSubscription()
            }, delay)
          }
        }
      })

    channelRef.current = channel
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Always refetch on visibility change to catch missed messages
        fetchMessages(true)

        if (!isConnected && supabase && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          setupRealtimeSubscription()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isConnected, setupRealtimeSubscription, fetchMessages])

  useEffect(() => {
    fetchMessages(true)

    if (!isDevelopment && !isLocalhost) {
      setupRealtimeSubscription()
    }

    // In dev/localhost, set up polling since real-time is disabled
    let pollInterval: NodeJS.Timeout | undefined
    if (isDevelopment || isLocalhost) {
      pollInterval = setInterval(() => fetchMessages(), MIN_FETCH_INTERVAL)
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [])

  return {
    messages,
    isLoading,
    isConnected: isDevelopment || isLocalhost ? false : isConnected,
    sendMessage,
    refetchMessages: fetchMessages
  }
}
