import { renderHook, act, waitFor } from '@testing-library/react'

// Mock supabase client
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockImplementation((cb) => {
    // Don't auto-subscribe in tests
    return mockChannel
  }),
  unsubscribe: jest.fn(),
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => mockChannel),
  },
}))

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Force production mode for real-time tests
const originalEnv = process.env.NODE_ENV
Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })

import { useRealtimeChat } from '../useRealtimeChat'

describe('useRealtimeChat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: successful fetch returning messages
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          messages: [
            { id: '1', message: 'hello', username: 'User1', created_at: '2025-01-01T00:00:00Z' },
            { id: '2', message: 'world', username: 'User2', created_at: '2025-01-01T00:01:00Z' },
          ],
        },
      }),
    })
  })

  afterAll(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true })
  })

  it('fetches messages on mount', async () => {
    const { result } = renderHook(() => useRealtimeChat())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0].id).toBe('1')
    expect(mockFetch).toHaveBeenCalledWith('/api/chat/messages?limit=50')
  })

  it('sendMessage calls API and does optimistic insert', async () => {
    const savedMessage = { id: '3', message: 'new msg', username: 'Me', created_at: '2025-01-01T00:02:00Z' }

    const { result } = renderHook(() => useRealtimeChat())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Mock the send API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { message: savedMessage, moderated: false } }),
    })

    await act(async () => {
      await result.current.sendMessage('new msg', '0xabc', 'Me')
    })

    // Message should be optimistically added
    expect(result.current.messages).toContainEqual(savedMessage)
  })

  it('sendMessage throws on API error', async () => {
    const { result } = renderHook(() => useRealtimeChat())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Message too long' }),
    })

    await expect(
      act(async () => {
        await result.current.sendMessage('x'.repeat(300), '0xabc', 'Me')
      })
    ).rejects.toThrow('Message too long')
  })

  it('deduplicates messages with same id', async () => {
    const { result } = renderHook(() => useRealtimeChat())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const existingMessage = { id: '1', message: 'hello', username: 'User1', created_at: '2025-01-01T00:00:00Z' }

    // Mock send that returns a message with an existing id
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { message: existingMessage, moderated: false } }),
    })

    await act(async () => {
      await result.current.sendMessage('hello', '0xabc', 'User1')
    })

    // Should still have 2 messages, not 3
    expect(result.current.messages).toHaveLength(2)
  })

  it('refetches messages on visibility change', async () => {
    const { result } = renderHook(() => useRealtimeChat())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Clear fetch calls from initial mount
    mockFetch.mockClear()

    // Simulate tab becoming visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    })

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/chat/messages?limit=50')
    })
  })
})
