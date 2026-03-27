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
      expect(result.error).toContain('Message too long')
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

    // Fix 9: Link and contact blocking tests
    describe('link and contact blocking', () => {
      it('should block http URLs', () => {
        expect(validateMessage('check http://evil.com').isValid).toBe(false)
      })

      it('should block https URLs', () => {
        expect(validateMessage('visit https://scam.io/free').isValid).toBe(false)
      })

      it('should block www URLs', () => {
        expect(validateMessage('go to www.badsite.net').isValid).toBe(false)
      })

      it('should block bare domain TLDs', () => {
        expect(validateMessage('visit mysite.com for deals').isValid).toBe(false)
      })

      it('should block social media handles', () => {
        expect(validateMessage('follow @scammer on twitter').isValid).toBe(false)
      })

      it('should block Ethereum addresses', () => {
        expect(validateMessage('send to 0x1234567890abcdef1234567890abcdef12345678').isValid).toBe(false)
      })

      it('should block Bitcoin addresses', () => {
        expect(validateMessage('send btc to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa').isValid).toBe(false)
      })

      it('should block phone numbers', () => {
        expect(validateMessage('call me at +1 555-123-4567').isValid).toBe(false)
      })

      it('should block "dot com" evasion', () => {
        expect(validateMessage('visit mysite DOT com').isValid).toBe(false)
      })

      it('should block scam investment phrases', () => {
        expect(validateMessage('earn 50% profit daily').isValid).toBe(false)
      })

      it('should block contact requests', () => {
        expect(validateMessage('dm me for details').isValid).toBe(false)
      })

      it('should block telegram mentions', () => {
        expect(validateMessage('message me on telegram').isValid).toBe(false)
      })

      it('should block whatsapp mentions', () => {
        expect(validateMessage('add me on whatsapp').isValid).toBe(false)
      })

      it('should allow legitimate short messages', () => {
        expect(validateMessage('this beat goes hard').isValid).toBe(true)
      })

      it('should allow messages with numbers that are not phone numbers', () => {
        expect(validateMessage('track 5 is fire').isValid).toBe(true)
      })

      it('should allow year ranges like "2024 - 2025"', () => {
        expect(validateMessage('best tracks of 2024 - 2025').isValid).toBe(true)
      })

      it('should allow short numeric sequences in conversation', () => {
        expect(validateMessage('score was 1234').isValid).toBe(true)
      })

      it('should allow timestamps in conversation', () => {
        expect(validateMessage('the drop at 01:23 is insane').isValid).toBe(true)
      })

      it('should still block real phone numbers with area codes', () => {
        expect(validateMessage('my number is 08012345678').isValid).toBe(false)
      })

      it('should block links on consecutive calls (no stale regex state)', () => {
        expect(validateMessage('check http://evil.com').isValid).toBe(false)
        expect(validateMessage('check http://evil.com').isValid).toBe(false)
      })
    })
  })
})
