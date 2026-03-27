/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockRequireSession = jest.fn()
const mockTouchSession = jest.fn()
const mockInsertMessage = jest.fn()

jest.mock('@/lib/domains/identity/auth', () => ({
  requireSession: () => mockRequireSession(),
}))

jest.mock('@/lib/domains/identity/session', () => ({
  touchSession: (...args: unknown[]) => mockTouchSession(...args),
}))

jest.mock('@/lib/domains/chat/repository', () => ({
  insertMessage: (...args: unknown[]) => mockInsertMessage(...args),
}))

jest.mock('@/lib/domains/moderation/moderation', () => ({
  moderateMessage: (msg: string) => ({
    isClean: !msg.includes('badword'),
    filteredMessage: msg.replace('badword', '****'),
    originalMessage: msg,
    flaggedWords: msg.includes('badword') ? ['badword'] : [],
  }),
  validateMessage: (msg: string) => {
    if (!msg?.trim()) return { isValid: false, error: 'Message cannot be empty' }
    if (msg.length > 200) return { isValid: false, error: 'Message too long' }
    return { isValid: true }
  },
}))

import { POST } from '../route'

const SESSION = {
  nullifier: '0xabc',
  username: 'TestUser',
  created_at: '2025-01-01',
  last_seen_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/chat/send', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/chat/send', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireSession.mockResolvedValue({ session: SESSION })
  })

  it('returns 401 when not authenticated', async () => {
    const errorResponse = { status: 401, json: async () => ({ error: 'Authentication required' }) }
    mockRequireSession.mockResolvedValueOnce({ error: errorResponse })

    const res = await POST(makeRequest({ message: 'hello' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for empty message', async () => {
    const res = await POST(makeRequest({ message: '' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Message cannot be empty')
  })

  it('inserts clean message and touches session', async () => {
    const savedMsg = { id: 'msg1', message: 'hello', username: 'TestUser', verified: true, created_at: '2025-01-01' }
    mockInsertMessage.mockResolvedValueOnce(savedMsg)

    const res = await POST(makeRequest({ message: 'hello' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.message).toEqual(savedMsg)
    expect(body.data.moderated).toBe(false)

    // Session was last seen 10 min ago, so touch should be called
    expect(mockTouchSession).toHaveBeenCalledWith('0xabc')
  })

  it('does not touch session if recently seen', async () => {
    const recentSession = { ...SESSION, last_seen_at: new Date().toISOString() }
    mockRequireSession.mockResolvedValueOnce({ session: recentSession })
    mockInsertMessage.mockResolvedValueOnce({ id: 'msg1', message: 'hi' })

    await POST(makeRequest({ message: 'hi' }))
    expect(mockTouchSession).not.toHaveBeenCalled()
  })

  it('flags moderated messages', async () => {
    mockInsertMessage.mockResolvedValueOnce({ id: 'msg2', message: '****' })

    const res = await POST(makeRequest({ message: 'badword' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.moderated).toBe(true)

    // Verify the filtered message was stored
    expect(mockInsertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message: '****', is_moderated: true })
    )
  })
})
