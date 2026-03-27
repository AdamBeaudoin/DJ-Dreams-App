import { mockResult, mockCalls, callsFor, resetMock, mockProxy } from '@/lib/test-utils/mock-supabase'

jest.mock('@/lib/supabaseServer', () => ({
  getSupabaseServer: () => ({ from: (...args: unknown[]) => { mockCalls.push({ method: 'from', args }); return mockProxy } }),
}))

import { lookupSession, createSession, touchSession } from '../session'

describe('Identity Session', () => {
  beforeEach(() => resetMock())

  describe('lookupSession', () => {
    it('returns session when found', async () => {
      const session = { nullifier: '0xabc123', username: 'Human #c123', created_at: '2025-01-01T00:00:00Z', last_seen_at: '2025-01-01T00:00:00Z' }
      mockResult.data = session

      const result = await lookupSession('0xabc123')
      expect(result).toEqual(session)
      expect(callsFor('from')[0].args).toEqual(['verified_sessions'])
      expect(callsFor('eq')[0].args).toEqual(['nullifier', '0xabc123'])
    })

    it('returns null when not found (PGRST116)', async () => {
      mockResult.error = { code: 'PGRST116', message: 'No rows' }
      expect(await lookupSession('0xnonexistent')).toBeNull()
    })

    it('throws on unexpected DB error', async () => {
      mockResult.error = { code: 'PGRST500', message: 'Connection failed' }
      await expect(lookupSession('0xabc')).rejects.toThrow('Session lookup failed')
    })
  })

  describe('createSession', () => {
    it('creates and returns a session', async () => {
      const session = { nullifier: '0xnew123', username: 'TestUser', created_at: '2025-01-01', last_seen_at: '2025-01-01' }
      mockResult.data = session

      const result = await createSession('0xnew123', 'TestUser')
      expect(result).toEqual(session)
      const upsertCall = callsFor('upsert')[0]
      expect(upsertCall.args[0]).toMatchObject({ nullifier: '0xnew123', username: 'TestUser' })
      expect(upsertCall.args[1]).toEqual({ onConflict: 'nullifier' })
    })

    it('throws on database error', async () => {
      mockResult.error = { message: 'DB error' }
      await expect(createSession('0xfail', 'User')).rejects.toThrow('Failed to create session')
    })
  })

  describe('touchSession', () => {
    it('updates last_seen_at', async () => {
      await touchSession('0xabc123')
      expect(callsFor('from')[0].args).toEqual(['verified_sessions'])
      expect(callsFor('update')[0].args[0]).toHaveProperty('last_seen_at')
      expect(callsFor('eq')[0].args).toEqual(['nullifier', '0xabc123'])
    })
  })
})
