import { moderateMessage, validateMessage } from '../moderation'

describe('Message Moderation', () => {
  describe('moderateMessage', () => {
    it('should flag profanity', () => {
      const result = moderateMessage('This is a damn test')
      expect(result.isClean).toBe(false)
      expect(result.filteredMessage).toBe('This is a **** test')
      expect(result.flaggedWords).toContain('damn')
    })

    it('should pass clean messages', () => {
      const result = moderateMessage('This track is amazing!')
      expect(result.isClean).toBe(true)
      expect(result.filteredMessage).toBe('This track is amazing!')
      expect(result.flaggedWords).toHaveLength(0)
    })

    it('should flag custom bad words', () => {
      const result = moderateMessage('This is spam content')
      expect(result.isClean).toBe(false)
      expect(result.filteredMessage).toBe('This is **** content')
      expect(result.flaggedWords).toContain('spam')
    })
  })

  describe('validateMessage', () => {
    it('should reject empty messages', () => {
      const result = validateMessage('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Message cannot be empty')
    })

    it('should reject messages that are too long', () => {
      const longMessage = 'a'.repeat(201)
      const result = validateMessage(longMessage)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Message too long (max 200 characters)')
    })

    it('should reject excessive repeated characters', () => {
      const result = validateMessage('Hellooooooo world')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Please avoid excessive repeated characters')
    })

    it('should reject excessive caps', () => {
      const result = validateMessage('THIS IS ALL CAPS AND ANNOYING')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Please reduce the use of capital letters')
    })

    it('should accept valid messages', () => {
      const result = validateMessage('This is a great track!')
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })
}) 