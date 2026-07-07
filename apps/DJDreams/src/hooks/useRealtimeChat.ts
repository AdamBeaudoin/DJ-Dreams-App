import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChatMessage } from '@/lib/domains/chat/types'
import { useToast } from '@/components/ui/use-toast'

const isDevelopment = process.env.NODE_ENV === 'development'
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'

// Realtime needs the browser Supabase client (anon key) and is disabled in dev.
const realtimeAvailable = !!supabase && !isDevelopment && !isLocalhost

// Interval for the polling transport — used both when realtime is unavailable
// (dev / no anon key) and as a fallback after realtime reconnects are exhausted.
const POLL_INTERVAL = 15_000
// Throttle for non-forced fetches (e.g. rapid visibility changes). When realtime
// is the transport, ad-hoc refetches should be rare.
const VISIBILITY_THROTTLE = realtimeAvailable ? 5 * 60_000 : POLL_INTERVAL
const MAX_RECONNECT_ATTEMPTS = 3

export function useRealtimeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [pollConnected, setPollConnected] = useState(false)

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchTimeRef = useRef(0)
  const donorUserIdsRef = useRef<Set<string>>(new Set())
  // Mirrors isConnected so the visibility listener can be bound once instead of
  // re-binding every time the connection flips.
  const isConnectedRef = useRef(false)
  const { toast } = useToast()

  const fetchMessages = useCallback(async (force = false) => {
    const now = Date.now()

    if (!force && now - lastFetchTimeRef.current < VISIBILITY_THROTTLE) {
      return
    }

    try {
      lastFetchTimeRef.current = now
      const response = await fetch('/api/chat/messages?limit=50')
      const data = await response.json()

      if (response.ok) {
        const msgs: ChatMessage[] = data.data?.messages || []
        // Refresh the donor set from server-enriched messages so realtime
        // INSERTs (which lack the flag) can be decorated correctly.
        const newDonors = new Set<string>()
        msgs.forEach(m => { if (m.is_donor) newDonors.add(m.user_id) })
        donorUserIdsRef.current = newDonors
        setMessages(msgs)
        if (pollIntervalRef.current) {
          setPollConnected(true)
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return
    setPollConnected(true)
    pollIntervalRef.current = setInterval(() => {
      fetchMessages(true)
    }, POLL_INTERVAL)
  }, [fetchMessages])

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
      setPollConnected(false)
    }
  }, [])

  const sendMessage = useCallback(async (
    message: string,
    _nullifier: string,
    _username: string
  ) => {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })

    const data = await response.json()

    if (!response.ok) {
      // Attach the status so the UI can distinguish auth expiry (401) from rate
      // limiting (429) and surface a specific toast instead of a generic error.
      const err = new Error(data.error || 'Failed to send message') as Error & {
        status?: number
      }
      err.status = response.status
      throw err
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
    if (!realtimeAvailable || !supabase) {
      setIsConnected(false)
      return
    }

    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setIsConnected(false)
      startPolling()
      return
    }

    // Tear down any existing channel before re-subscribing so retries don't leak
    // channels/sockets.
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
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
          // Realtime is healthy again — drop the fallback poll if it was running.
          stopPolling()
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current += 1
            const delay = Math.min(30000 * Math.pow(2, reconnectAttemptsRef.current), 120000)
            reconnectTimeoutRef.current = setTimeout(() => {
              setupRealtimeSubscription()
            }, delay)
          } else {
            // Exhausted reconnects — fall back to polling so messages still flow.
            startPolling()
          }
        }
      })

    channelRef.current = channel
  }, [startPolling, stopPolling])

  useEffect(() => {
    isConnectedRef.current = isConnected
  }, [isConnected])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Always refetch on visibility change to catch missed messages
        fetchMessages(true)

        if (!isConnectedRef.current && realtimeAvailable && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          setupRealtimeSubscription()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchMessages, setupRealtimeSubscription])

  useEffect(() => {
    fetchMessages(true)

    if (realtimeAvailable) {
      setupRealtimeSubscription()
    } else {
      // Without realtime, polling is the only way messages arrive.
      startPolling()
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [fetchMessages, setupRealtimeSubscription, startPolling])

  return {
    messages,
    isLoading,
    isEmpty: !isLoading && messages.length === 0,
    isConnected: realtimeAvailable ? isConnected : pollConnected,
    sendMessage,
  }
}
