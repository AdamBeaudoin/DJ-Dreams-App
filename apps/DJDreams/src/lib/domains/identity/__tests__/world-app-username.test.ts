/**
 * @jest-environment jsdom
 */

const mockIsInstalled = jest.fn()
const mockGetUserByAddress = jest.fn()

jest.mock('@worldcoin/minikit-js', () => ({
  MiniKit: {
    isInstalled: () => mockIsInstalled(),
    get user() {
      return (globalThis as { __minikitUser?: { username?: string; walletAddress?: string } }).__minikitUser ?? {}
    },
    getUserByAddress: (...args: unknown[]) => mockGetUserByAddress(...args),
  },
}))

import { resolveWorldAppUsername } from '../world-app-username'

describe('resolveWorldAppUsername', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(globalThis as { __minikitUser?: { username?: string; walletAddress?: string } }).__minikitUser = {}
  })

  it('returns undefined outside World App', async () => {
    mockIsInstalled.mockReturnValue(false)
    expect(await resolveWorldAppUsername()).toBeUndefined()
  })

  it('returns cached MiniKit username when available', async () => {
    mockIsInstalled.mockReturnValue(true)
    ;(globalThis as { __minikitUser?: { username?: string } }).__minikitUser = { username: 'alice' }

    expect(await resolveWorldAppUsername()).toBe('alice')
    expect(mockGetUserByAddress).not.toHaveBeenCalled()
  })

  it('looks up username by wallet address when cache is empty', async () => {
    mockIsInstalled.mockReturnValue(true)
    ;(globalThis as { __minikitUser?: { walletAddress?: string } }).__minikitUser = {
      walletAddress: '0x123',
    }
    mockGetUserByAddress.mockResolvedValue({ username: 'bob', walletAddress: '0x123' })

    expect(await resolveWorldAppUsername()).toBe('bob')
    expect(mockGetUserByAddress).toHaveBeenCalledWith('0x123')
  })
})
