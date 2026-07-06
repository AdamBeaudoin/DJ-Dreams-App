/**
 * @jest-environment node
 */
import { __clearNonces } from '@/lib/domains/identity/nonce-store'

import { POST } from '../route'

describe('POST /api/identity/nonce', () => {
  beforeEach(() => {
    __clearNonces()
  })

  it('returns a valid nonce', async () => {
    const res = await POST()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(typeof body.nonce).toBe('string')
    expect(body.nonce.length).toBeGreaterThanOrEqual(8)
    expect(body.nonce).toMatch(/^[0-9a-zA-Z]+$/)
    expect(body.nonce).not.toContain('-')
  })

  it('issues different nonces across calls', async () => {
    const a = await (await POST()).json()
    const b = await (await POST()).json()
    expect(a.nonce).not.toBe(b.nonce)
  })
})
