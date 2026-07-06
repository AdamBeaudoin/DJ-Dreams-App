interface ChatEmptyStateProps {
  isVerified: boolean
}

/**
 * Friendly placeholder shown once messages have loaded but there are none.
 * Keeps the redesigned token-based styling (text-muted-foreground, rounded-xl,
 * animate-fade-in) and tailors the prompt to the user's verification state.
 */
export function ChatEmptyState({ isVerified }: ChatEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full text-center animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center mb-3 text-primary/60 text-xl">
        ♪
      </div>
      <p className="text-sm text-muted-foreground font-medium">No messages yet</p>
      <p className="text-xs text-muted-foreground/70 mt-1 max-w-[14rem]">
        {isVerified
          ? 'Be the first to say something!'
          : 'Verify with World ID to join the chat'}
      </p>
    </div>
  )
}
