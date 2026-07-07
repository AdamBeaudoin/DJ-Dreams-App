'use client'

import { memo } from 'react'
import type { ChatMessage } from '@/lib/domains/chat/types'

interface MiniChatOverlayProps {
  messages: ChatMessage[]
  onTap: () => void
}

const VISIBLE_COUNT = 3

export const MiniChatOverlay = memo(function MiniChatOverlay({ messages, onTap }: MiniChatOverlayProps) {
  const recentMessages = messages.slice(-VISIBLE_COUNT)

  if (recentMessages.length === 0) return null

  return (
    <div
      className="absolute bottom-14 right-2 z-10 w-48 pointer-events-auto"
      onClick={(e) => { e.stopPropagation(); onTap() }}
      role="button"
      tabIndex={0}
      aria-label="Open full chat"
    >
      <div className="flex flex-col gap-1 p-2 rounded-lg bg-black/40 backdrop-blur-sm">
        {recentMessages.map((msg) => (
          <div key={msg.id} className="text-[10px] leading-tight truncate">
            <span className={`font-medium ${msg.is_donor ? 'text-amber-400' : 'text-gray-400'}`}>
              {msg.is_donor && '◆ '}
              {msg.username}
            </span>
            <span className="text-gray-300 ml-1">{msg.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
})
