import { Filter } from 'bad-words'

const filter = new Filter()

// Add custom words specific to your app if needed
const customBadWords = [
  // Spam/Scam related
  'spam', 'scam', 'bot', 'fake','death to isreal','jews','jewish','death to Iran',
  

  

  
  // Adult content
  'onlyfans', 'nsfw',
  
  // Harassment/Toxicity 
  'toxic', 'trash', 'garbage', 'loser', 'idiot', 'moron', 'stupid',
  'hate', 'kill', 'die', 'kys', 'suicide', 'fuck', 'shit', 'pussy', 'dick', 'cock', 'ass', 'bitch', 'whore', 'slut', 'nigger', 'fagot'
  
  
  
  // Add your own words here:
  // 'word1', 'word2', 'word3'
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

  // 🚫 BLOCK ALL LINKS AND URLS - Anti-scam protection
  const linkPatterns = [
    // Standard URLs
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    /[a-zA-Z0-9-]+\.(com|org|net|edu|gov|io|co|tv|me|app|xyz|info|biz|online|site|tech|store|shop|money|crypto|invest|trade|forex|profit|earn|cash|rich|wealth|fund|loan|bank|pay|win|free|deal|offer|promo|discount|sale|buy|sell|click|link|bit\.ly|tinyurl|short|redirect|go|join|sign)/gi,
    
    // Social media handles and redirects
    /@[a-zA-Z0-9_]+/g,
    /instagram\.com|twitter\.com|tiktok\.com|youtube\.com|facebook\.com|telegram\.me|t\.me|discord\.gg|snapchat\.com|onlyfans\.com/gi,
    
    // Crypto/Wallet addresses
    /[13][a-km-zA-HJ-NP-Z1-9]{25,34}/g, // Bitcoin
    /0x[a-fA-F0-9]{40}/g, // Ethereum
    
    // Suspicious patterns
    /\b(dot|DOT)\b.*\b(com|org|net|co|io|tv|me|app)\b/gi, // "mydomain DOT com"
    /[a-zA-Z0-9]+\s*(dot|DOT|\.|·|•|⋅)\s*[a-zA-Z0-9]+/gi, // any "word dot word" pattern
    
    // Investment/money scam phrases
    /\$[0-9,]+(\+|\sand\sup|\sor\smore|\sper|\sdaily|\sweekly|\smonthly)/gi,
    /[0-9]+%\s*(profit|return|interest|roi|apy|yield)/gi,
    
    // Contact patterns
    /whatsapp|telegram|signal|wickr|kik|discord|dm\s*me|message\s*me|contact\s*me|reach\s*out/gi,
    /\+?[0-9\s\-\(\)]{8,}/g, // Phone numbers
  ]
  
  for (const pattern of linkPatterns) {
    if (pattern.test(message)) {
      return { isValid: false, error: 'Links and contact information are not allowed - this helps keep our community safe from scams' }
    }
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