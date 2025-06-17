'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { MiniKit } from '@worldcoin/minikit-js'
import { useAnalytics } from '@/hooks/use-analytics'

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: Date
  verified: boolean
}

export function ChatRoom() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userWallet, setUserWallet] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { updateVerification } = useAnalytics()

  // Mock messages for demo
  useEffect(() => {
    const timer = setTimeout(() => {
      const mockMessages: ChatMessage[] = [
        {
          id: '1',
          user: '0x1234...5678',
          message: 'This track is fire! 🔥',
          timestamp: new Date(Date.now() - 300000),
          verified: true
        },
        {
          id: '2',
          user: '0xabcd...efgh',
          message: 'Love the vibe tonight',
          timestamp: new Date(Date.now() - 180000),
          verified: true
        },
        {
          id: '3',
          user: '0x9876...5432',
          message: 'Anyone know the track ID?',
          timestamp: new Date(Date.now() - 60000),
          verified: true
        }
      ]
      setMessages(mockMessages)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleVerifyWorldID = async () => {
    setIsLoading(true)
    try {
      // Check if MiniKit is available
      if (!MiniKit.isInstalled()) {
        toast({
          title: "World App Required",
          description: "Please open this app in World App to verify your World ID",
          variant: "destructive",
        })
        return
      }

      // Mock verification for demo
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const worldId = 'world_' + Math.random().toString(16).substr(2, 8)
      const walletAddress = '0x' + Math.random().toString(16).substr(2, 8) + '...' + Math.random().toString(16).substr(2, 4)
      
      setIsVerified(true)
      setUserWallet(walletAddress)
      
      // Update analytics with verification
      await updateVerification(worldId)
      
      toast({
        title: "Verified! ✅",
        description: "You can now chat with other verified users",
      })
    } catch (error) {
      toast({
        title: "Verification failed",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !isVerified) return

    const message: ChatMessage = {
      id: Date.now().toString(),
      user: userWallet,
      message: newMessage.trim(),
      timestamp: new Date(),
      verified: true
    }

    setMessages(prev => [...prev, message])
    setNewMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm sm:text-base flex items-center gap-2">
          💬 Live Chat
          <span className="text-xs text-gray-400">({messages.length} messages)</span>
        </h3>
        {!isVerified && (
          <Button
            onClick={handleVerifyWorldID}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-3 py-1 h-8 rounded-lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying...</span>
              </div>
            ) : (
              '🌍 Verify World ID'
            )}
          </Button>
        )}
      </div>

      {/* Messages Container */}
      <div className="h-48 sm:h-64 bg-black/20 rounded-lg p-3 mb-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No messages yet. Be the first to chat!
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-300 font-medium">{msg.user}</span>
                  <span className="text-gray-500">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="text-white text-sm bg-white/5 rounded-lg px-3 py-2 ml-2">
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      {isVerified ? (
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 bg-black/20 border-white/10 text-white placeholder-gray-400 text-sm"
            maxLength={200}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 h-10 rounded-lg"
          >
            Send
          </Button>
        </div>
      ) : (
        <div className="text-center text-gray-400 text-sm py-4">
          Verify your World ID to join the conversation
        </div>
      )}
    </div>
  )
} 