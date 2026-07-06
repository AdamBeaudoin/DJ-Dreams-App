import {
  defaultDisplayName,
  isFallbackUsername,
  resolveDisplayName,
  sanitizeUsername,
} from '../username'

describe('identity username helpers', () => {
  describe('sanitizeUsername', () => {
    it('trims and accepts valid usernames', () => {
      expect(sanitizeUsername('  alice  ')).toBe('alice')
    })

    it('rejects empty and overlong values', () => {
      expect(sanitizeUsername('')).toBeNull()
      expect(sanitizeUsername('a'.repeat(33))).toBeNull()
      expect(sanitizeUsername(null)).toBeNull()
    })
  })

  describe('defaultDisplayName', () => {
    it('uses the last six nullifier characters', () => {
      expect(defaultDisplayName('0xdef456')).toBe('Human #def456')
    })
  })

  describe('isFallbackUsername', () => {
    it('detects generated fallback names', () => {
      expect(isFallbackUsername('Human #abc123')).toBe(true)
      expect(isFallbackUsername('alice')).toBe(false)
    })
  })

  describe('resolveDisplayName', () => {
    it('prefers a sanitized username', () => {
      expect(resolveDisplayName('0xabc123', '  bob  ')).toBe('bob')
    })

    it('falls back to Human # when username is missing', () => {
      expect(resolveDisplayName('0xabc123')).toBe('Human #abc123')
    })
  })
})
