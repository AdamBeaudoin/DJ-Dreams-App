'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/use-toast'
import { WorldIdVerify } from '@/components/identity/world-id-verify'
import { ChatSkeleton } from '@/components/chat/chat-skeleton'
import { ChatEmptyState } from '@/components/chat/chat-empty-state'
import { MAX_MESSAGE_LENGTH, type ChatMessage } from '@/lib/domains/chat/types'

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const ChatMessageItem = memo(function ChatMessageItem({
  message,
  displayName,
}: {
  message: ChatMessage
  displayName: string
}) {
  return (
    <div className="flex flex-col gap-1 animate-fade-in">
      <div className="flex items-center gap-2 text-xs">
        {message.is_donor && <span className="text-amber-400 text-[10px]" title="Donor">◆</span>}
        <span className="font-medium text-foreground/90">{displayName}</span>
        <span className="text-muted-foreground">{formatTime(message.created_at)}</span>
      </div>
      <div className={`text-foreground text-sm bg-white/[0.06] border border-white/10 rounded-xl rounded-tl-sm px-3 py-2 ml-4 break-words leading-relaxed transition-colors hover:bg-white/[0.09]${message.is_donor ? ' border-l-2 border-l-amber-400/70' : ''}`}>
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
  sendMessage: (message: string, nullifier: string, username: string) => Promise<ChatMessage | undefined>
}

export function ChatRoom({
  nullifier, username, onVerified,
  messages, isLoading, isConnected, sendMessage,
}: ChatRoomProps) {
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const isVerified = nullifier !== null

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isVerified || isSending || !nullifier) return

    setIsSending(true)

    try {
      await sendMessage(newMessage.trim(), nullifier, username)
      setNewMessage('')
    } catch (error) {
      const e = error as Error & { status?: number }
      console.error('Failed to send message:', e)
      if (e.status === 401) {
        toast({
          title: 'Session expired',
          description: 'Please verify with World ID again.',
          variant: 'destructive',
        })
      } else if (e.status === 429) {
        toast({
          title: 'Slow down',
          description: e.message || 'You are sending messages too quickly.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Failed to send',
          description: e.message || 'Something went wrong. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div id="chat-room" className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-md p-3 sm:p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-primary font-semibold text-sm sm:text-base flex items-center gap-2 tracking-wide font-display">
          Live Chat
          <span className="text-xs text-primary/50 font-normal font-sans">({messages.length})</span>
          <div
            role="status"
            aria-label={isConnected ? 'Chat connected' : 'Chat disconnected'}
            title={isConnected ? 'Connected' : 'Disconnected'}
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary shadow-glow' : 'bg-red-400'}`}
          />
        </h3>
        {!isVerified && <WorldIdVerify onVerified={onVerified} />}
      </div>

      {/* Messages container */}
      <div className="bg-black/20 border border-white/5 rounded-xl p-3 sm:p-4 h-64 sm:h-80 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {isLoading ? (
          <ChatSkeleton />
        ) : messages.length === 0 ? (
          <ChatEmptyState isVerified={isVerified} />
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                displayName={message.user_id === nullifier ? username : message.username}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={!isVerified ? "Verify with World ID to chat" : "Type your message…"}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isVerified}
          className="flex-1 bg-black/30 border-white/10 text-foreground placeholder:text-muted-foreground focus:border-primary/50 min-h-[44px] touch-manipulation"
          maxLength={MAX_MESSAGE_LENGTH}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || !isVerified || isSending}
          className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 hover:shadow-glow disabled:bg-muted disabled:text-muted-foreground disabled:border-transparent px-4 sm:px-6 min-h-[44px] rounded-full touch-manipulation transition-all duration-200 active:scale-[0.97]"
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
