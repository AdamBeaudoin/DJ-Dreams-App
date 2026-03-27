import { mockResult, mockCalls, callsFor, resetMock, mockProxy } from '@/lib/test-utils/mock-supabase'

jest.mock('@/lib/supabaseServer', () => ({
  getSupabaseServer: () => ({ from: (...args: unknown[]) => { mockCalls.push({ method: 'from', args }); return mockProxy } }),
}))

import { createReference, consumeReference } from '../repository'

describe('Payments Repository', () => {
  beforeEach(() => resetMock())

  describe('createReference', () => {
    it('creates a reference with nullifier binding', async () => {
      const result = await createReference('0xabc', 'tip')
      expect(result.id).toBeDefined()
      expect(result.id.length).toBeGreaterThan(0)

      const insertCall = callsFor('insert')[0]
      expect(insertCall.args[0]).toMatchObject({ nullifier: '0xabc', purpose: 'tip', used: false })
    })

    it('throws on database error', async () => {
      mockResult.error = { message: 'Insert failed' }
      await expect(createReference('0xabc', 'tip')).rejects.toThrow('Failed to create payment reference')
    })
  })

  describe('consumeReference', () => {
    it('returns true when reference is valid, unused, and session matches', async () => {
      mockResult.data = { id: 'ref1' }

      const result = await consumeReference('ref1', '0xabc', 'tx123')
      expect(result).toBe(true)

      const updateCall = callsFor('update')[0]
      expect(updateCall.args[0]).toMatchObject({ used: true, transaction_id: 'tx123' })

      const eqCalls = callsFor('eq')
      expect(eqCalls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ args: ['id', 'ref1'] }),
          expect.objectContaining({ args: ['nullifier', '0xabc'] }),
          expect.objectContaining({ args: ['used', false] }),
        ])
      )

      // Verify expiry filter is applied
      expect(callsFor('gt')).toHaveLength(1)
      expect(callsFor('gt')[0].args[0]).toBe('created_at')
    })

    it('returns false when reference is already used or session mismatch', async () => {
      mockResult.error = { message: 'No rows' }
      expect(await consumeReference('ref1', '0xabc', 'tx123')).toBe(false)
    })
  })
})
