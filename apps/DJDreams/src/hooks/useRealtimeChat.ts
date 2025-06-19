import { useState, useEffect, useCallback } from 'react'
import { supabase, type ChatMessage } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

export function useRealtimeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
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

  // Set up real-time subscription
  useEffect(() => {
    fetchMessages()

    // Only set up real-time subscription if Supabase is configured
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
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      channel.unsubscribe()
    }
  }, [fetchMessages])

  return {
    messages,
    isLoading,
    isConnected,
    sendMessage,
    refetchMessages: fetchMessages
  }
} 