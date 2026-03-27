/**
 * Shared Supabase mock for domain repository tests.
 *
 * Usage:
 *   import { mockResult, mockCalls, callsFor, resetMock, mockProxy } from '@/lib/test-utils/mock-supabase'
 *
 *   jest.mock('@/lib/supabaseServer', () => ({
 *     getSupabaseServer: () => ({ from: (...args: unknown[]) => { mockCalls.push({ method: 'from', args }); return mockProxy } }),
 *   }))
 *
 *   beforeEach(() => resetMock())
 */

export const mockResult = { data: null as unknown, error: null as unknown }
export const mockCalls: { method: string; args: unknown[] }[] = []

function mockTrack(method: string) {
  return (...args: unknown[]) => {
    mockCalls.push({ method, args })
    return mockProxy
  }
}

export const mockProxy: Record<string, unknown> = {
  get data() { return mockResult.data },
  get error() { return mockResult.error },
}
for (const m of ['select', 'insert', 'update', 'upsert', 'eq', 'gt', 'in', 'order', 'range', 'limit']) {
  mockProxy[m] = mockTrack(m)
}
mockProxy.single = () => { mockCalls.push({ method: 'single', args: [] }); return mockResult }

export function callsFor(method: string) {
  return mockCalls.filter(c => c.method === method)
}

export function resetMock() {
  mockCalls.length = 0
  mockResult.data = null
  mockResult.error = null
}
