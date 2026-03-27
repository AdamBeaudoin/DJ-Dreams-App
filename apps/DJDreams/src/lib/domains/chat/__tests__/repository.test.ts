import { mockResult, mockCalls, resetMock, mockProxy } from '@/lib/test-utils/mock-supabase'

jest.mock('@/lib/supabaseServer', () => ({
  getSupabaseServer: () => ({ from: (...args: unknown[]) => { mockCalls.push({ method: 'from', args }); return mockProxy } }),
}))

import { fetchMessages, insertMessage } from '../repository'
import type { ChatMessageInsert } from '../types'

describe('Chat Repository', () => {
  beforeEach(() => resetMock())

  describe('fetchMessages', () => {
    it('returns messages in chronological order', async () => {
      mockResult.data = [
        { id: '2', message: 'second', created_at: '2025-01-02' },
        { id: '1', message: 'first', created_at: '2025-01-01' },
      ]

      const result = await fetchMessages(50, 0)
      expect(result[0].id).toBe('1')
      expect(result[1].id).toBe('2')
    })

    it('throws on database error', async () => {
      mockResult.error = { message: 'DB error' }
      await expect(fetchMessages(50, 0)).rejects.toThrow('Failed to fetch messages')
    })
  })

  describe('insertMessage', () => {
    it('inserts and returns the message', async () => {
      const savedMessage = { id: 'msg1', user_id: '0xabc', username: 'TestUser', message: 'Hello', verified: true, created_at: '2025-01-01T00:00:00Z' }
      mockResult.data = savedMessage

      const input: ChatMessageInsert = { user_id: '0xabc', username: 'TestUser', message: 'Hello', verified: true }
      const result = await insertMessage(input)
      expect(result).toEqual(savedMessage)
    })

    it('throws on insert error', async () => {
      mockResult.error = { message: 'Insert failed' }

      const input: ChatMessageInsert = { user_id: '0xabc', username: 'TestUser', message: 'Hello', verified: true }
      await expect(insertMessage(input)).rejects.toThrow('Failed to insert message')
    })
  })
})
