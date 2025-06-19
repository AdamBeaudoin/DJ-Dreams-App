'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/use-toast'
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'
import type { ChatMessage } from '@/lib/supabase'

export function ChatRoom() {
  const [newMessage, setNewMessage] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [userWallet, setUserWallet] = useState<string>('')
  const [nullifierHash, setNullifierHash] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  
  // Use the real-time chat hook
  const { messages, isLoading, isConnected, sendMessage } = useRealtimeChat()

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleVerifyWorldID = async () => {
    setIsVerifying(true)
    
    try {
      // Check if MiniKit is available (running in World App)
      if (!MiniKit.isInstalled()) {
        toast({
          title: "World App Required",
          description: "Please open this app in World App to verify your World ID",
          variant: "destructive",
        })
        setIsVerifying(false)
        return
      }

      const verifyPayload: VerifyCommandInput = {
        action: 'dj-dreams-chat-verification',
        signal: window.location.origin,
        verification_level: VerificationLevel.Device
      }

      console.log('Starting World ID verification with payload:', verifyPayload)
      
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
          payload: finalPayload as ISuccessResult,
          action: 'dj-dreams-chat-verification',
          signal: window.location.origin,
        }),
      })

      const verifyResponseJson = await verifyResponse.json()
      console.log('Backend verification response:', verifyResponseJson)
      
      if (verifyResponseJson.status === 200) {
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
      setIsVerifying(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isVerified || isSending) return

    setIsSending(true)
    
    try {
      await sendMessage(
        newMessage.trim(),
        nullifierHash || userWallet,
        userWallet,
        nullifierHash,
        isVerified
      )
      setNewMessage('')
    } catch (error) {
      // Error is already handled in the hook with toast
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm sm:text-base flex items-center gap-2">
          💬 Live Chat
          <span className="text-xs text-gray-400">({messages.length} messages)</span>
          {/* Connection status indicator */}
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} 
               title={isConnected ? 'Connected' : 'Disconnected'} />
        </h3>
        {!isVerified && (
          <Button 
            onClick={handleVerifyWorldID}
            disabled={isVerifying}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-3 py-1 min-h-[44px] rounded-lg touch-manipulation"
          >
            {isVerifying ? (
              <div className="flex items-center gap-1">
                <Spinner size="sm" />
                <span className="hidden sm:inline">Verifying...</span>
                <span className="sm:hidden">...</span>
              </div>
            ) : (
              <>
                <span className="hidden sm:inline">Verify with World ID</span>
                <span className="sm:hidden">Verify</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Messages container */}
      <div className="bg-black/20 border border-white/5 rounded-lg p-3 sm:p-4 h-64 sm:h-80 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="flex items-center gap-2">
              <Spinner size="md" />
              <span>Loading messages...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-center">
            <div>
              <div className="text-2xl mb-2">💬</div>
              <p className="text-sm">No messages yet</p>
              <p className="text-xs text-gray-500 mt-1">
                {isVerified ? "Be the first to say something!" : "Verify with World ID to join the chat"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-medium ${message.verified ? 'text-green-400' : 'text-gray-400'}`}>
                    {message.verified ? '✅' : '👤'} {message.username}
                  </span>
                  <span className="text-gray-500">
                    {formatTime(message.created_at)}
                  </span>
                </div>
                <div className="text-white text-sm bg-white/5 rounded-lg px-3 py-2 ml-4 break-words">
                  {message.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={
            isVerified 
              ? "Type your message..." 
              : "Verify with World ID to chat"
          }
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!isVerified}
          className="flex-1 bg-black/20 border-white/10 text-white placeholder-gray-400 focus:border-white/30 min-h-[44px] touch-manipulation"
          maxLength={500}
        />
        <Button 
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || !isVerified || isSending}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 sm:px-6 min-h-[44px] touch-manipulation"
        >
          {isSending ? (
            <Spinner size="md" />
          ) : (
            <>
              <span className="hidden sm:inline">Send</span>
              <span className="sm:hidden">📤</span>
            </>
          )}
        </Button>
      </div>

      {/* Status messages */}
      {!isConnected && (
        <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
          <div className="w-2 h-2 bg-red-400 rounded-full" />
          Disconnected from chat server
        </div>
      )}
      
      {isVerified && (
        <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          Verified as {userWallet}
        </div>
      )}
    </div>
  )
} 