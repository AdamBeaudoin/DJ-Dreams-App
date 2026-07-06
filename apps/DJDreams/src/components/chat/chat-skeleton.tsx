const SKELETON_ROWS = 4

/**
 * First-load placeholder shown while chat messages are being fetched.
 * Uses the redesigned token-based classes (bg-card, rounded-xl, animate-pulse)
 * so it visually matches the rest of the chat room.
 */
export function ChatSkeleton() {
  return (
    <div
      className="space-y-3 animate-fade-in"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading messages"
    >
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-24 rounded-full bg-card animate-pulse" />
            <div className="h-2 w-10 rounded-full bg-white/10 animate-pulse" />
          </div>
          <div className="h-8 w-3/4 rounded-xl bg-card animate-pulse ml-4" />
        </div>
      ))}
      <span className="sr-only">Loading messages…</span>
    </div>
  )
}
