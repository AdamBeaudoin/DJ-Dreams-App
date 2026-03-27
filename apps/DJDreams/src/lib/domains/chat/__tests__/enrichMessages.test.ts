const mockGetDonorNullifiers = jest.fn()

jest.mock('@/lib/domains/payments/repository', () => ({
  getDonorNullifiers: (...args: unknown[]) => mockGetDonorNullifiers(...args),
}))

jest.mock('@/lib/supabaseServer', () => ({
  getSupabaseServer: jest.fn(),
}))

import { enrichMessagesWithDonorStatus } from '../repository'
import type { ChatMessage } from '../types'

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    user_id: 'user-a',
    username: 'Alice',
    message: 'hello',
    verified: true,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('enrichMessagesWithDonorStatus', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns empty array for empty input', async () => {
    mockGetDonorNullifiers.mockResolvedValueOnce(new Set())
    const result = await enrichMessagesWithDonorStatus([])
    expect(result).toEqual([])
    expect(mockGetDonorNullifiers).toHaveBeenCalledWith([])
  })

  it('marks donors correctly in mixed list', async () => {
    const messages = [
      makeMessage({ id: '1', user_id: 'donor-1', username: 'Alice' }),
      makeMessage({ id: '2', user_id: 'non-donor', username: 'Bob' }),
      makeMessage({ id: '3', user_id: 'donor-2', username: 'Charlie' }),
    ]
    mockGetDonorNullifiers.mockResolvedValueOnce(new Set(['donor-1', 'donor-2']))

    const result = await enrichMessagesWithDonorStatus(messages)

    expect(result[0].is_donor).toBe(true)
    expect(result[1].is_donor).toBe(false)
    expect(result[2].is_donor).toBe(true)
  })

  it('marks all as non-donor when no one has donated', async () => {
    const messages = [
      makeMessage({ id: '1', user_id: 'user-a' }),
      makeMessage({ id: '2', user_id: 'user-b' }),
    ]
    mockGetDonorNullifiers.mockResolvedValueOnce(new Set())

    const result = await enrichMessagesWithDonorStatus(messages)

    expect(result.every(m => m.is_donor === false)).toBe(true)
  })

  it('deduplicates nullifiers before querying', async () => {
    const messages = [
      makeMessage({ id: '1', user_id: 'user-a' }),
      makeMessage({ id: '2', user_id: 'user-a' }),
      makeMessage({ id: '3', user_id: 'user-b' }),
    ]
    mockGetDonorNullifiers.mockResolvedValueOnce(new Set(['user-a']))

    await enrichMessagesWithDonorStatus(messages)

    // Should pass only unique nullifiers
    const calledWith = mockGetDonorNullifiers.mock.calls[0][0] as string[]
    expect(calledWith).toHaveLength(2)
    expect(new Set(calledWith)).toEqual(new Set(['user-a', 'user-b']))
  })

  it('preserves all original message fields', async () => {
    const original = makeMessage({ id: '1', user_id: 'user-a', is_boosted: true, is_moderated: true })
    mockGetDonorNullifiers.mockResolvedValueOnce(new Set(['user-a']))

    const [result] = await enrichMessagesWithDonorStatus([original])

    expect(result.id).toBe('1')
    expect(result.is_boosted).toBe(true)
    expect(result.is_moderated).toBe(true)
    expect(result.is_donor).toBe(true)
  })
})
