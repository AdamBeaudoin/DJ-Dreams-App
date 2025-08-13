import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type ChatMessage } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

// Check if we're in development environment
const isDevelopment = process.env.NODE_ENV === 'development'
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'

export function useRealtimeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [lastFetchTime, setLastFetchTime] = useState(0)
  const channelRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // EMERGENCY BRAKE: Maximum reconnection attempts (reduced from infinite to 3)
  const MAX_RECONNECT_ATTEMPTS = 3
  // EMERGENCY BRAKE: Minimum time between API calls (5 minutes for local dev)
  const MIN_FETCH_INTERVAL = isDevelopment || isLocalhost ? 5 * 60 * 1000 : 30 * 1000 // 5 minutes local, 30 seconds production

  // Fetch initial messages with rate limiting
  const fetchMessages = useCallback(async () => {
    const now = Date.now()
    
    // EMERGENCY BRAKE: Prevent excessive API calls
    if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
      console.log(`[RATE LIMIT] Skipping fetch - too soon. Wait ${Math.ceil((MIN_FETCH_INTERVAL - (now - lastFetchTime)) / 1000)}s`)
      return
    }

    try {
      console.log('[FETCH] Getting messages from API...')
      setLastFetchTime(now)
      
      const response = await fetch('/api/chat/messages?limit=50')
      const data = await response.json()
      
      // Accept either HTTP status code success or legacy JSON { status: 200 }
      const isOk = response.ok || data.status === 200
      if (isOk && Array.isArray(data.messages)) {
        setMessages(data.messages || [])
        console.log(`[FETCH] Got ${data.messages?.length || 0} messages`)
      } else {
        console.error('Failed to fetch messages:', data.error || 'Unexpected response shape')
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoading(false)
    }
  }, [lastFetchTime])

  // Send a message
  const sendMessage = useCallback(async (
    message: string,
    userId: string,
    username: string,
    nullifierHash?: string,
    verified: boolean = true
  ) => {
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId,
          username,
          nullifierHash,
          verified
        }),
      })

      const data = await response.json()
      
      if (data.status !== 200) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Show moderation notice if message was filtered
      if (data.moderated) {
        toast({
          title: "Message Moderated",
          description: "Your message contained inappropriate content and was filtered",
          variant: "destructive",
        })
      }

      // IMMEDIATE REFRESH: Fetch messages after sending (but respect rate limit)
      setTimeout(() => fetchMessages(), 1000)

      return data.message
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Send Failed",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      })
      throw error
    }
  }, [toast, fetchMessages])

  // EMERGENCY BRAKE: Severely limited reconnection logic
  const reconnect = useCallback(() => {
    if (!supabase || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log(`[RECONNECT] Stopped - Max attempts reached (${MAX_RECONNECT_ATTEMPTS}) or Supabase not available`)
      setIsConnected(false)
      return
    }

    console.log(`[RECONNECT] Attempting... (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`)
    setReconnectAttempts(prev => prev + 1)

    // Clean up existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    // EMERGENCY BRAKE: Much longer backoff delays (30s, 60s, 120s)
    const delay = Math.min(30000 * Math.pow(2, reconnectAttempts), 120000) // Max 2 minutes
    console.log(`[RECONNECT] Waiting ${delay/1000}s before retry...`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setupRealtimeSubscription()
      // DO NOT CALL fetchMessages() here - this was causing the spam!
    }, delay)
  }, [reconnectAttempts])

  // Set up real-time subscription with emergency brakes
  const setupRealtimeSubscription = useCallback(() => {
    // EMERGENCY BRAKE: Disable real-time in local development
    if (isDevelopment || isLocalhost) {
      console.log('[REALTIME] Disabled in development - using manual refresh only')
      setIsConnected(false)
      return
    }

    if (!supabase) {
      console.log('[REALTIME] Supabase not configured - chat disabled')
      setIsConnected(false)
      return
    }

    // EMERGENCY BRAKE: Don't try if we've exceeded attempts
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[REALTIME] Max reconnect attempts exceeded - giving up')
      setIsConnected(false)
      return
    }

    console.log('[REALTIME] Setting up subscription...')

    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages' 
        }, 
        (payload) => {
          console.log('[REALTIME] New message received:', payload.new)
          const newMessage = payload.new as ChatMessage
          
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
        }
      )
      .subscribe((status) => {
        console.log('[REALTIME] Subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setReconnectAttempts(0) // Reset on successful connection
          console.log('[REALTIME] ✅ Connected successfully')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          console.log('[REALTIME] ❌ Connection failed, will attempt reconnect...')
          
          // EMERGENCY BRAKE: Only reconnect if we haven't exceeded attempts
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            setTimeout(reconnect, 5000) // 5 second delay before reconnect
          } else {
            console.log('[REALTIME] ⛔ Max reconnect attempts reached - stopping')
          }
        }
      })

    channelRef.current = channel
  }, [reconnect, reconnectAttempts])

  // Handle page visibility changes (with rate limiting)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && supabase) {
        const now = Date.now()
        // EMERGENCY BRAKE: Don't reconnect too frequently
        if (now - lastFetchTime > MIN_FETCH_INTERVAL && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          console.log('[VISIBILITY] Page visible - attempting reconnect...')
          setupRealtimeSubscription()
        } else {
          console.log('[VISIBILITY] Skipping reconnect - too frequent or max attempts reached')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isConnected, setupRealtimeSubscription, lastFetchTime, reconnectAttempts])

  // EMERGENCY BRAKE: Only fetch once on initial load
  useEffect(() => {
    console.log('[INIT] Initializing chat...')
    console.log(`[INIT] Environment: ${isDevelopment ? 'development' : 'production'}, Localhost: ${isLocalhost}`)
    
    // Initial message fetch
    fetchMessages()
    
    // Only setup real-time in production
    if (!isDevelopment && !isLocalhost) {
      setupRealtimeSubscription()
    } else {
      console.log('[INIT] Real-time disabled - use manual refresh in development')
    }

    return () => {
      console.log('[CLEANUP] Cleaning up chat...')
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, []) // Empty dependency array - only run once!

  return {
    messages,
    isLoading,
    isConnected: isDevelopment || isLocalhost ? false : isConnected, // Show as disconnected in dev
    sendMessage,
    refetchMessages: fetchMessages
  }
} 