jest.mock('next/server', () => {
  class HeadersMap extends Map<string, string> {
    get(name: string) { return super.get(name) as any }
    set(name: string, value: string) { super.set(name, value); return this as any }
  }
  return {
    NextResponse: {
      next: () => ({ headers: new HeadersMap() }),
    },
  }
})

import { middleware } from './middleware'

const buildReq = (url = 'http://localhost/') => ({ url } as any)

describe('middleware security headers', () => {
  it('sets CSP and security headers', () => {
    const res: any = middleware(buildReq() as any)
    expect(res.headers.get('Content-Security-Policy')).toMatch(/default-src 'self'/)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(res.headers.get('Permissions-Policy')).toBeDefined()
  })
})


