'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js'

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
  const [nullifierHash, setNullifierHash] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Mock messages for demo - these would come from your backend in production
  useEffect(() => {
    const timer = setTimeout(() => {
      const mockMessages: ChatMessage[] = [
        {
          id: '1',
          user: 'Verified Human #1',
          message: 'This track is fire! 🔥',
          timestamp: new Date(Date.now() - 300000),
          verified: true
        },
        {
          id: '2',
          user: 'Verified Human #2',
          message: 'Love the vibe tonight',
          timestamp: new Date(Date.now() - 180000),
          verified: true
        },
        {
          id: '3',
          user: 'Verified Human #3',
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
      // Check if MiniKit is available (running in World App)
      if (!MiniKit.isInstalled()) {
        toast({
          title: "World App Required",
          description: "Please open this app in World App to verify your World ID",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const verifyPayload: VerifyCommandInput = {
        action: 'dj-dreams-chat', // This should match your action ID from the Developer Portal
        signal: window.location.origin, // Optional additional data
        verification_level: VerificationLevel.Orb // Orb | Device
      }

      console.log('Starting World ID verification with payload:', verifyPayload)
      
      // World App will open a drawer prompting the user to confirm the operation
      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload)
      
      console.log('World ID verification response:', finalPayload)

      if (finalPayload.status === 'error') {
        console.log('World ID verification failed:', finalPayload)
        toast({
          title: "Verification Failed",
          description: "World ID verification failed",
          variant: "destructive",
        })
        return
      }

      // Verify the proof in the backend
      const verifyResponse = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: finalPayload as ISuccessResult, // Parses only the fields we need to verify
          action: 'dj-dreams-chat',
          signal: window.location.origin, // Optional
        }),
      })

      const verifyResponseJson = await verifyResponse.json()
      console.log('Backend verification response:', verifyResponseJson)
      
      if (verifyResponseJson.status === 200) {
        // Verification successful!
        const successPayload = finalPayload as ISuccessResult
        const userIdentifier = `Human #${successPayload.nullifier_hash.slice(-6)}`
        
        setIsVerified(true)
        setUserWallet(userIdentifier)
        setNullifierHash(successPayload.nullifier_hash)
        
        toast({
          title: "Verified! ✅",
          description: "You can now chat with other verified humans",
        })
      } else {
        // Backend verification failed
        console.log('Backend verification failed:', verifyResponseJson)
        toast({
          title: "Verification Failed",
          description: verifyResponseJson.message || "Could not verify your proof",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('World ID verification error:', error)
      toast({
        title: "Verification Error",
        description: "An unexpected error occurred. Please try again.",
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
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-3 py-1 min-h-[44px] rounded-lg touch-manipulation"
          >
            {isLoading ? (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                <span className="hidden sm:inline">Verifying...</span>
                <span className="sm:hidden">...</span>
              </div>
            ) : (
              <>
                <span className="hidden sm:inline">🌍 Verify World ID</span>
                <span className="sm:hidden">🌍 Verify</span>
              </>
            )}
          </Button>
        )}
        {isVerified && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-green-400">Verified Human</span>
          </div>
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
                  <span className="text-gray-300 font-medium flex items-center gap-1">
                    {msg.user}
                    {msg.verified && <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>}
                  </span>
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
            className="flex-1 bg-black/20 border-white/10 text-white placeholder-gray-400 text-sm min-h-[44px]"
            maxLength={200}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 min-h-[44px] rounded-lg text-sm"
          >
            <span className="hidden sm:inline">Send</span>
            <span className="sm:hidden">📤</span>
          </Button>
        </div>
      ) : (
        <div className="text-center text-gray-400 text-sm py-4 border border-gray-600 rounded-lg">
          <div className="mb-2">🌍 Verify your World ID to join the conversation</div>
          <div className="text-xs text-gray-500">
            Only verified humans can chat • Prevents bots and spam
          </div>
        </div>
      )}
    </div>
  )
} 