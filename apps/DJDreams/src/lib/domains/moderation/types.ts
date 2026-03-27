export interface ModerationResult {
  isClean: boolean
  filteredMessage: string
  originalMessage: string
  flaggedWords: string[]
}
