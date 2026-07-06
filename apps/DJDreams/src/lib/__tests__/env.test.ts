/**
 * @jest-environment node
 */
import {
  env,
  tryReadEnv,
  MissingEnvError,
  _resetEnvForTests,
} from '../env'

const REQUIRED_ENV = {
  NEXT_PUBLIC_APP_ID: 'app_test',
  RP_ID: 'rp_test',
  RP_SIGNING_KEY: 'signing_key_test',
  DEV_PORTAL_API_KEY: 'key_test',
  NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.test',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon_test',
  SUPABASE_SERVICE_ROLE_KEY: 'service_test',
}

describe('env', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    _resetEnvForTests()
    for (const [k, v] of Object.entries(REQUIRED_ENV)) {
      savedEnv[k] = process.env[k]
      process.env[k] = v
    }
  })

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
    _resetEnvForTests()
  })

  describe('required accessors', () => {
    it('return the configured value', () => {
      expect(env.appId()).toBe('app_test')
      expect(env.rpId()).toBe('rp_test')
      expect(env.rpSigningKey()).toBe('signing_key_test')
      expect(env.devPortalApiKey()).toBe('key_test')
      expect(env.supabaseUrl()).toBe('https://supabase.test')
      expect(env.supabaseAnonKey()).toBe('anon_test')
      expect(env.supabaseServiceRoleKey()).toBe('service_test')
    })

    it('read process.env once and memoize (later mutations ignored until reset)', () => {
      expect(env.appId()).toBe('app_test')
      process.env.NEXT_PUBLIC_APP_ID = 'app_changed'
      expect(env.appId()).toBe('app_test') // cached
      _resetEnvForTests()
      expect(env.appId()).toBe('app_changed')
    })

    it('throw MissingEnvError listing every missing required var on first use', () => {
      delete process.env.NEXT_PUBLIC_APP_ID
      delete process.env.RP_SIGNING_KEY
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      _resetEnvForTests()

      expect(() => env.appId()).toThrow(MissingEnvError)
      expect(() => env.appId()).toThrow(/Missing env vars:/)
      expect(() => env.appId()).toThrow('Missing env vars: NEXT_PUBLIC_APP_ID, RP_SIGNING_KEY, SUPABASE_SERVICE_ROLE_KEY')
    })

    it('treat empty-string vars as missing', () => {
      process.env.RP_ID = ''
      _resetEnvForTests()
      expect(() => env.rpId()).toThrow(/Missing env vars: RP_ID/)
    })

    it('expose the missing list on the error', () => {
      delete process.env.DEV_PORTAL_API_KEY
      _resetEnvForTests()
      try {
        env.devPortalApiKey()
        fail('expected throw')
      } catch (e) {
        expect(e).toBeInstanceOf(MissingEnvError)
        expect((e as MissingEnvError).missing).toEqual(['DEV_PORTAL_API_KEY'])
      }
    })
  })

  describe('optional accessors with defaults', () => {
    it('fall back to defaults when unset', () => {
      delete process.env.NEXT_PUBLIC_TIP_RECIPIENT_ADDRESS
      delete process.env.NEXT_PUBLIC_TIP_AMOUNT
      _resetEnvForTests()
      expect(env.tipRecipientAddress()).toBe('0x693d8dced3be29222691123656daea9f18e95f4b')
      expect(env.tipAmount()).toBe(1)
    })

    it('use configured values when set', () => {
      process.env.NEXT_PUBLIC_TIP_RECIPIENT_ADDRESS = '0xTip'
      process.env.NEXT_PUBLIC_TIP_AMOUNT = '5'
      _resetEnvForTests()
      expect(env.tipRecipientAddress()).toBe('0xTip')
      expect(env.tipAmount()).toBe(5)
    })

    it('do not throw when only optional vars are missing but required are set', () => {
      delete process.env.NEXT_PUBLIC_TIP_RECIPIENT_ADDRESS
      delete process.env.NEXT_PUBLIC_TIP_AMOUNT
      _resetEnvForTests()
      expect(() => env.tipRecipientAddress()).not.toThrow()
      expect(() => env.tipAmount()).not.toThrow()
    })
  })

  describe('tryReadEnv', () => {
    it('returns the value when set', () => {
      expect(tryReadEnv('NEXT_PUBLIC_SUPABASE_URL')).toBe('https://supabase.test')
    })

    it('returns undefined (without throwing) when the var is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      _resetEnvForTests()
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      expect(tryReadEnv('NEXT_PUBLIC_SUPABASE_URL')).toBeUndefined()
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/Missing env vars:/))
      warn.mockRestore()
    })

    it('logs the missing list only once', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      _resetEnvForTests()
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      tryReadEnv('NEXT_PUBLIC_SUPABASE_URL')
      tryReadEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
      expect(warn).toHaveBeenCalledTimes(1)
      warn.mockRestore()
    })
  })
})
