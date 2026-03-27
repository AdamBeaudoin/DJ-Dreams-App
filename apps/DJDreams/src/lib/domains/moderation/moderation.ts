import { Filter } from 'bad-words'
import type { ModerationResult } from './types'
import { MAX_MESSAGE_LENGTH } from '@/lib/domains/chat/types'
import customWords from './custom-words.json'

const filter = new Filter()
filter.addWords(...customWords)

// Pre-compiled combined patterns for link/contact detection
const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|org|net|edu|gov|io|co|tv|me|app|xyz|info|biz|online|site|tech|store|shop|money|crypto|invest|trade|forex|profit|earn|cash|rich|wealth|fund|loan|bank|pay|win|free|deal|offer|promo|discount|sale|buy|sell|click|link|bit\.ly|tinyurl|short|redirect|go|join|sign)/i

const SOCIAL_AND_CRYPTO_PATTERN = /@[a-zA-Z0-9_]+|instagram\.com|twitter\.com|tiktok\.com|youtube\.com|facebook\.com|telegram\.me|t\.me|discord\.gg|snapchat\.com|onlyfans\.com|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|0x[a-fA-F0-9]{40}/i

const CONTACT_AND_SCAM_PATTERN = /\b(dot|DOT)\b.*\b(com|org|net|co|io|tv|me|app)\b|[a-zA-Z0-9]+\s*(dot|DOT|\.|·|•|⋅)\s*[a-zA-Z0-9]+|\$[0-9,]+(\+|\sand\sup|\sor\smore|\sper|\sdaily|\sweekly|\smonthly)|[0-9]+%\s*(profit|return|interest|roi|apy|yield)|whatsapp|telegram|signal|wickr|kik|discord|dm\s*me|message\s*me|contact\s*me|reach\s*out|\+\d[\d\s\-\(\)]{7,}\d|\b(?=[\d\s\-\(\)]*\d{7})[\d\s\-\(\)]{9,}\b/i

const LINK_PATTERNS = [URL_PATTERN, SOCIAL_AND_CRYPTO_PATTERN, CONTACT_AND_SCAM_PATTERN]

export function moderateMessage(message: string): ModerationResult {
  const originalMessage = message.trim()

  const isClean = !filter.isProfane(originalMessage)
  const filteredMessage = filter.clean(originalMessage)

  // Derive flagged words by comparing original tokens with filtered output
  const originalWords = originalMessage.split(/\s+/)
  const filteredWords = filteredMessage.split(/\s+/)
  const flaggedWords: string[] = []
  for (let i = 0; i < originalWords.length && i < filteredWords.length; i++) {
    if (filteredWords[i] !== originalWords[i]) {
      flaggedWords.push(originalWords[i])
    }
  }

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

  if (message.length > MAX_MESSAGE_LENGTH) {
    return { isValid: false, error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` }
  }

  // Block links, URLs, and contact info — anti-scam protection
  for (const pattern of LINK_PATTERNS) {
    if (pattern.test(message)) {
      return { isValid: false, error: 'Links and contact information are not allowed - this helps keep our community safe from scams' }
    }
  }

  if (/(.)\1{4,}/.test(message)) {
    return { isValid: false, error: 'Please avoid excessive repeated characters' }
  }

  const capsCount = (message.match(/[A-Z]/g) || []).length
  if (capsCount / message.length > 0.7 && message.length > 10) {
    return { isValid: false, error: 'Please reduce the use of capital letters' }
  }

  return { isValid: true }
}
