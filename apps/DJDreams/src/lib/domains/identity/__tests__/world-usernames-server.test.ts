/**
 * @jest-environment node
 */
import { resolveUsernameByAddress } from '../world-usernames-server'

type FetchMock = jest.Mock & { mockResolvedValueOnce?: never }

describe('resolveUsernameByAddress', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  function mockFetch(impl: () => Promise<Response>): FetchMock {
    const fn = jest.fn(impl) as unknown as FetchMock
    global.fetch = fn as unknown as typeof global.fetch
    return fn
  }

  function jsonResponse(body: unknown, status = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response
  }

  it('returns the sanitized username on a 200 response', async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ username: 'alice_01', wallet_address: '0xWALLET' }))
    const result = await resolveUsernameByAddress('0xWALLET')
    expect(result).toBe('alice_01')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://usernames.worldcoin.org/api/v1/usernames/0xWALLET',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    )
  })

  it('trims whitespace via sanitizeUsername', async () => {
    mockFetch(async () => jsonResponse({ username: '  bob  ' }))
    const result = await resolveUsernameByAddress('0xWALLET')
    expect(result).toBe('bob')
  })

  it('returns null on 404 (no username for address)', async () => {
    mockFetch(async () => jsonResponse({ error: 'not found' }, 404))
    const result = await resolveUsernameByAddress('0xWALLET')
    expect(result).toBeNull()
  })

  it('returns null on 500', async () => {
    mockFetch(async () => jsonResponse({ error: 'boom' }, 500))
    const result = await resolveUsernameByAddress('0xWALLET')
    expect(result).toBeNull()
  })

  it('returns null when the response body has no username', async () => {
    mockFetch(async () => jsonResponse({ wallet_address: '0xWALLET' }))
    const result = await resolveUsernameByAddress('0xWALLET')
    expect(result).toBeNull()
  })

  it('returns null when the username fails sanitization (too long)', async () => {
    const long = 'x'.repeat(100)
    mockFetch(async () => jsonResponse({ username: long }))
    const result = await resolveUsernameByAddress('0xWALLET')
    expect(result).toBeNull()
  })

  it('returns null when the response is not a JSON object', async () => {
    mockFetch(async () => jsonResponse('not-an-object'))
    const result = await resolveUsernameByAddress('0xWALLET')
    expect(result).toBeNull()
  })

  it('returns null when fetch throws (network error)', async () => {
    mockFetch(async () => {
      throw new Error('network down')
    })
    const result = await resolveUsernameByAddress('0xWALLET')
    expect(result).toBeNull()
  })

  it('returns null when res.json() throws', async () => {
    mockFetch(async () =>
      ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('bad json')
        },
      } as unknown as Response)
    )
    const result = await resolveUsernameByAddress('0xWALLET')
    expect(result).toBeNull()
  })

  it('returns null for an empty address without calling fetch', async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ username: 'alice' }))
    const result = await resolveUsernameByAddress('')
    expect(result).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
