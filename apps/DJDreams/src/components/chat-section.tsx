'use client'

import { memo } from 'react'
import { ChatRoom } from '@/components/chat-room'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'

interface ChatSectionProps {
  nullifier: string | null
  username: string
  canWrite: boolean
  sessionChecked: boolean
  needsUsername: boolean
  isUpgradingUsername: boolean
  onUpgradeUsername: () => void
  onVerified: (nullifier: string, username: string) => void
}

/**
 * Owns the realtime chat state so its frequent updates (new messages, polling,
 * optimistic sends) re-render only the chat subtree — never the video player.
 * Session-derived props come from the parent and change infrequently.
 */
function ChatSectionInner(props: ChatSectionProps) {
  const { messages, isLoading, isConnected, sendMessage } = useRealtimeChat()

  return (
    <ChatRoom
      {...props}
      messages={messages}
      isLoading={isLoading}
      isConnected={isConnected}
      sendMessage={sendMessage}
    />
  )
}

export const ChatSection = memo(ChatSectionInner)
