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
  /** True only after the server confirmed a valid session cookie — gates write access. */
  canWrite: boolean
  /** False until GET /api/identity/session has completed on mount. */
  sessionChecked: boolean
  /** Signed in, but still on a "Human #xxxxxx" fallback name — offer walletAuth upgrade. */
  needsUsername: boolean
  isUpgradingUsername: boolean
  onUpgradeUsername: () => void
  onVerified: (nullifier: string, username: string) => void
  messages: ChatMessage[]
  isLoading: boolean
  isConnected: boolean
  sendMessage: (message: string, nullifier: string, username: string) => Promise<ChatMessage | undefined>
}

export function ChatRoom({
  nullifier, username, canWrite, sessionChecked,
  needsUsername, isUpgradingUsername, onUpgradeUsername, onVerified,
  messages, isLoading, isConnected, sendMessage,
}: ChatRoomProps) {
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !canWrite || isSending || !nullifier) return

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

  const needsVerify = sessionChecked && !canWrite

  // #region agent log
  useEffect(() => {
    if (typeof fetch === 'undefined') return
    fetch('http://127.0.0.1:7841/ingest/e247fcfa-b334-4b3c-a271-ed20379bacfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'797957'},body:JSON.stringify({sessionId:'797957',runId:'verify-cta-v2',hypothesisId:'H',location:'chat-room.tsx:verify-cta',message:'verify CTA state',data:{canWrite,sessionChecked,needsVerify,messageCount:messages.length,isLoading},timestamp:Date.now()})}).catch(()=>{});
    fetch('/api/debug/client-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'797957',runId:'verify-cta-v2',hypothesisId:'H',location:'chat-room.tsx:verify-cta',message:'verify CTA state',data:{canWrite,sessionChecked,needsVerify,messageCount:messages.length,isLoading}})}).catch(()=>{});
  }, [canWrite, sessionChecked, needsVerify, messages.length, isLoading])
  // #endregion

  return (
    <div id="chat-room" className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-md p-3 sm:p-5 shadow-card">
      <div className="mb-4 min-w-0">
        <h3 className="text-primary font-semibold text-sm sm:text-base flex items-center gap-2 tracking-wide font-display">
          Live Chat
          <span className="text-xs text-primary/50 font-normal font-sans">({messages.length})</span>
          <div
            role="status"
            aria-label={isConnected ? 'Chat connected' : 'Chat disconnected'}
            title={isConnected ? 'Connected' : 'Disconnected'}
            className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-primary shadow-glow' : 'bg-red-400'}`}
          />
        </h3>
      </div>

      {/* Messages container */}
      <div className="bg-black/20 border border-white/5 rounded-xl p-3 sm:p-4 h-64 sm:h-80 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {isLoading ? (
          <ChatSkeleton />
        ) : messages.length === 0 ? (
          <ChatEmptyState isVerified={canWrite} />
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

      {/* Auth state + input — sticky on mobile so the Verify CTA can't scroll off-screen on iPhone mini */}
      <div className="sticky bottom-0 z-10 -mx-3 px-3 pt-2 pb-1 bg-gradient-to-t from-card via-card/95 to-transparent sm:static sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0 sm:bg-transparent">
        {!sessionChecked && (
          <div
            className="mb-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-center text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Checking session…
          </div>
        )}
        {needsVerify && (
          <div
            id="verify-cta"
            className="mb-3 rounded-xl border border-primary/30 bg-primary/10 p-3 scroll-mt-24"
          >
            <p className="text-xs text-muted-foreground text-center mb-2">
              Verify with World ID to join the live chat
            </p>
            <WorldIdVerify onVerified={onVerified} fullWidth />
          </div>
        )}
        {sessionChecked && canWrite && needsUsername && (
          <div className="mb-3 rounded-xl border border-primary/30 bg-primary/10 p-3">
            <p className="text-xs text-muted-foreground text-center mb-2">
              You&apos;re chatting as <span className="text-foreground/80">{username}</span>. Connect
              your World App username to show your name.
            </p>
            <Button
              onClick={onUpgradeUsername}
              disabled={isUpgradingUsername}
              className="w-full bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 hover:shadow-glow text-xs sm:text-sm min-h-[44px] rounded-full touch-manipulation transition-all duration-200 active:scale-[0.97]"
            >
              {isUpgradingUsername ? (
                <div className="flex items-center gap-1">
                  <Spinner size="sm" />
                  <span>Connecting…</span>
                </div>
              ) : (
                'Set your username'
              )}
            </Button>
          </div>
        )}
        {sessionChecked && canWrite && !needsUsername && (
          <div
            className="mb-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-center text-xs text-muted-foreground"
            role="status"
          >
            Signed in as <span className="text-cyan-400/80 font-medium">{username || 'verified user'}</span>
          </div>
        )}

        {/* Message input */}
        <div className="flex gap-2">
        <Input
          type="text"
          placeholder={!canWrite ? "Verify with World ID to chat" : "Type your message…"}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!canWrite}
          className="flex-1 bg-black/30 border-white/10 text-foreground placeholder:text-muted-foreground focus:border-primary/50 min-h-[44px] touch-manipulation"
          maxLength={MAX_MESSAGE_LENGTH}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || !canWrite || isSending}
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
      </div>

      {canWrite && (
        <div className="mt-2 text-[10px] text-white/30 uppercase tracking-wider sm:block hidden">
          <span className="text-cyan-400/50">{username}</span>
        </div>
      )}
    </div>
  )
}
