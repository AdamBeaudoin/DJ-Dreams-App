import { Filter } from 'bad-words'

const filter = new Filter()

// Add custom words specific to your app if needed
const customBadWords = [
  'spam', 'scam', 'bot', 'fake'
]

filter.addWords(...customBadWords)

export interface ModerationResult {
  isClean: boolean
  filteredMessage: string
  originalMessage: string
  flaggedWords: string[]
}

export function moderateMessage(message: string): ModerationResult {
  const originalMessage = message.trim()
  
  // Check if message contains profanity
  const isClean = !filter.isProfane(originalMessage)
  
  // Get filtered version
  const filteredMessage = filter.clean(originalMessage)
  
  // Find flagged words
  const words = originalMessage.toLowerCase().split(/\s+/)
  const flaggedWords = words.filter(word => filter.isProfane(word))
  
  return {
    isClean,
    filteredMessage,
    originalMessage,
    flaggedWords
  }
}

export function validateMessage(message: string): { isValid: boolean; error?: string } {
  if (!message.trim()) {
    return { isValid: false, error: 'Message cannot be empty' }
  }
  
  if (message.length > 200) {
    return { isValid: false, error: 'Message too long (max 200 characters)' }
  }
  
  if (message.length < 1) {
    return { isValid: false, error: 'Message too short' }
  }
  
  // Check for excessive repeated characters
  if (/(.)\1{4,}/.test(message)) {
    return { isValid: false, error: 'Please avoid excessive repeated characters' }
  }
  
  // Check for excessive caps
  const capsCount = (message.match(/[A-Z]/g) || []).length
  if (capsCount / message.length > 0.7 && message.length > 10) {
    return { isValid: false, error: 'Please reduce the use of capital letters' }
  }
  
  return { isValid: true }
} 