// Mock Next.js server APIs before importing the route
jest.mock('next/server', () => {
  const headers = new Map<string, string>()
  return {
    NextRequest: class {},
    NextResponse: {
      json: (body: any, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        json: async () => body,
      }),
    },
  }
})

// Mock Supabase clients to avoid importing ESM packages in tests
jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}))
jest.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: null,
}))

import { POST as sendPost } from '../chat/send/route'
import { NextRequest } from 'next/server'

// Helper to build a NextRequest from JSON
function buildRequest(body: any) {
  const url = 'http://localhost/api/chat/send'
  // Minimal shape consumed by route handler
  return {
    nextUrl: new URL(url),
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/chat/send', () => {
  it('rejects when not verified (no admin fallback)', async () => {
    // Simulate missing admin client by not setting envs in test; route falls back to client flag
    const req = buildRequest({ message: 'hello', userId: 'u1', username: 'u1', verified: false })
    const res = await sendPost(req)
    expect(res.status).toBe(403)
  })

  it('validates message length', async () => {
    const long = 'a'.repeat(201)
    const req = buildRequest({ message: long, userId: 'u1', username: 'u1', verified: true })
    const res = await sendPost(req)
    expect(res.status).toBe(400)
  })
})


