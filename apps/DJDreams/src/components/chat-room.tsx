'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { WorldIdVerify } from '@/components/identity/world-id-verify'
import { MAX_MESSAGE_LENGTH, type ChatMessage } from '@/lib/domains/chat/types'

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const ChatMessageItem = memo(function ChatMessageItem({ message }: { message: ChatMessage }) {
  if (message.is_boosted) {
    return (
      <div className="rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-400/30 p-3">
        <div className="flex items-center gap-2 text-xs mb-1">
          {message.is_donor && <span className="text-amber-400 text-[10px]">◆</span>}
          <span className="font-medium text-amber-300">{message.username}</span>
          <span className="text-amber-400/60 text-[10px] font-semibold uppercase tracking-wide">Boosted</span>
          <span className="text-gray-500 ml-auto">{formatTime(message.created_at)}</span>
        </div>
        <div className="text-white text-base break-words">
          {message.message}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs">
        {message.is_donor && <span className="text-amber-400 text-[10px]" title="Donor">◆</span>}
        <span className="font-medium text-gray-300">{message.username}</span>
        <span className="text-gray-500">{formatTime(message.created_at)}</span>
      </div>
      <div className={`text-white text-sm bg-white/5 rounded-lg px-3 py-2 ml-4 break-words${message.is_donor ? ' border-l-2 border-amber-400/60' : ''}`}>
        {message.message}
      </div>
    </div>
  )
})

interface ChatRoomProps {
  nullifier: string | null
  username: string
  onVerified: (nullifier: string, username: string) => void
  messages: ChatMessage[]
  isLoading: boolean
  isConnected: boolean
  sendMessage: (message: string, nullifier: string, username: string, is_boosted?: boolean) => Promise<ChatMessage | undefined>
  isBoostMode?: boolean
  onBoost?: () => void
  isBoosting?: boolean
  onBoostMessageSent?: () => void
}

export function ChatRoom({
  nullifier, username, onVerified,
  messages, isLoading, isConnected, sendMessage,
  isBoostMode, onBoost, isBoosting, onBoostMessageSent,
}: ChatRoomProps) {
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isVerified = nullifier !== null

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isVerified || isSending || !nullifier) return

    setIsSending(true)

    try {
      await sendMessage(newMessage.trim(), nullifier, username, isBoostMode || false)
      setNewMessage('')
      if (isBoostMode) {
        onBoostMessageSent?.()
      }
    } catch (error) {
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

  return (
    <div id="chat-room" className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-cyan-300 font-semibold text-sm sm:text-base flex items-center gap-2 tracking-wide">
          Live Chat
          <span className="text-xs text-cyan-300/40 font-normal">({messages.length})</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyan-400' : 'bg-red-400'}`}
               title={isConnected ? 'Connected' : 'Disconnected'} />
        </h3>
        {!isVerified && <WorldIdVerify onVerified={onVerified} />}
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
              <p className="text-sm">No messages yet</p>
              <p className="text-xs text-gray-500 mt-1">
                {isVerified ? "Be the first to say something!" : "Verify with World ID to join the chat"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <ChatMessageItem key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Boost mode indicator */}
      {isBoostMode && (
        <div className="mb-2 text-xs text-amber-400 flex items-center gap-1">
          <span>⚡</span> Type your boosted message below
        </div>
      )}

      {/* Message input */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={
            !isVerified
              ? "Verify with World ID to chat"
              : isBoostMode
                ? "Type your boosted message..."
                : "Type your message..."
          }
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!isVerified}
          className={`flex-1 bg-black/20 border-white/10 text-white placeholder-gray-400 focus:border-white/30 min-h-[44px] touch-manipulation${isBoostMode ? ' ring-2 ring-amber-400/60' : ''}`}
          maxLength={MAX_MESSAGE_LENGTH}
        />
        {isVerified && onBoost && (
          <Button
            onClick={onBoost}
            disabled={isBoosting || isBoostMode}
            className="bg-amber-600/80 hover:bg-amber-600 disabled:bg-gray-600 text-white px-3 min-h-[44px] touch-manipulation"
            title="Boost a message"
          >
            {isBoosting ? <Spinner size="md" /> : '⚡'}
          </Button>
        )}
        <Button
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || !isVerified || isSending}
          className={`${isBoostMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-300 border border-cyan-400/30'} disabled:bg-gray-800 disabled:text-gray-500 disabled:border-transparent px-4 sm:px-6 min-h-[44px] rounded-full touch-manipulation`}
        >
          {isSending ? (
            <Spinner size="md" />
          ) : (
            'Send'
          )}
        </Button>
      </div>

      {/* Status messages */}
      {!isConnected && (
        <div className="mt-2 text-[10px] text-red-400/70 flex items-center gap-1.5 uppercase tracking-wider">
          <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
          Offline
        </div>
      )}

      {isVerified && (
        <div className="mt-2 text-[10px] text-white/30 uppercase tracking-wider">
          <span className="text-cyan-400/50">{username}</span>
        </div>
      )}
    </div>
  )
}
