import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type ChatMessage } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

export function useRealtimeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const channelRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/messages?limit=50')
      const data = await response.json()
      
      if (data.status === 200) {
        setMessages(data.messages || [])
      } else {
        console.error('Failed to fetch messages:', data.error)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

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
  }, [toast])

  // Reconnection logic
  const reconnect = useCallback(() => {
    if (!supabase || reconnectAttempts >= 5) {
      console.log('Max reconnection attempts reached or Supabase not available')
      return
    }

    console.log(`Attempting to reconnect... (attempt ${reconnectAttempts + 1}/5)`)
    setReconnectAttempts(prev => prev + 1)

    // Clean up existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    // Exponential backoff: wait 2^attempt seconds
    const delay = Math.pow(2, reconnectAttempts) * 1000
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setupRealtimeSubscription()
    }, delay)
  }, [reconnectAttempts])

  // Set up real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!supabase) {
      console.log('Supabase not configured - real-time chat disabled')
      setIsConnected(false)
      return
    }

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
          console.log('New message received:', payload.new)
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
        console.log('Realtime subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setReconnectAttempts(0) // Reset reconnection attempts on successful connection
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          // Attempt to reconnect after a delay
          setTimeout(reconnect, 2000)
        }
      })

    channelRef.current = channel
  }, [reconnect])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && supabase) {
        console.log('Page became visible, attempting to reconnect...')
        setupRealtimeSubscription()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isConnected, setupRealtimeSubscription])

  // Initial setup
  useEffect(() => {
    fetchMessages()
    setupRealtimeSubscription()

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [fetchMessages, setupRealtimeSubscription])

  return {
    messages,
    isLoading,
    isConnected,
    sendMessage,
    refetchMessages: fetchMessages
  }
} 