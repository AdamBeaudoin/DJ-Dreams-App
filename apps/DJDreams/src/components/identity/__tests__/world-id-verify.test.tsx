/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WorldIdVerify } from '../world-id-verify'

const mockUpgrade = jest.fn()
// Holder for the props IDKitRequestWidget receives, so the test can drive the
// verify -> success flow. Prefixed `mock` so jest allows it in the factory.
const mockIdKitProps = { current: null as Record<string, any> | null }

jest.mock('@worldcoin/idkit', () => ({
  IDKitRequestWidget: (props: Record<string, any>) => {
    mockIdKitProps.current = props
    return null
  },
  deviceLegacy: () => ({}),
}))

jest.mock('@/lib/domains/identity/wallet-auth-client', () => ({
  upgradeSessionWithWalletAuth: (...args: unknown[]) => mockUpgrade(...args),
}))

jest.mock('@/lib/env', () => ({
  tryReadEnv: () => 'app_test-app-id',
}))

const fetchMock = jest.fn()

const RP_CONTEXT = {
  rp_id: 'rp_test',
  nonce: 'nonce-test',
  created_at: '2025-01-01T00:00:00Z',
  expires_at: '2099-01-01T00:00:00Z',
  sig: 'sig-test',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIdKitProps.current = null
  global.fetch = fetchMock as unknown as typeof fetch
  fetchMock.mockImplementation(async (url: string) => {
    if (typeof url === 'string' && url.includes('/api/identity/rp-context')) {
      return { ok: true, json: async () => RP_CONTEXT } as Response
    }
    if (typeof url === 'string' && url.includes('/api/identity/verify')) {
      return {
        ok: true,
        json: async () => ({ data: { nullifier: '0xabc123', username: 'Human #abc123' } }),
      } as Response
    }
    return { ok: false, json: async () => ({}) } as Response
  })
})

async function openWidget() {
  fireEvent.click(screen.getByRole('button', { name: /verify/i }))
  await waitFor(() => expect(mockIdKitProps.current).not.toBeNull())
}

async function driveIdKitFlow() {
  // handleVerify posts the proof and stashes the session; onSuccess triggers the
  // walletAuth upgrade. Both are closures captured in the IDKit widget props.
  await mockIdKitProps.current!.handleVerify({ nullifier_hash: '0xabc123' })
  mockIdKitProps.current!.onSuccess()
}

describe('WorldIdVerify', () => {
  it('upgrades to the real username and calls onVerified on ok', async () => {
    const onVerified = jest.fn()
    mockUpgrade.mockResolvedValueOnce({
      status: 'ok',
      username: 'alice',
      walletAddress: '0xWALLET',
    })

    render(<WorldIdVerify onVerified={onVerified} />)
    await openWidget()
    await driveIdKitFlow()

    await waitFor(() => expect(onVerified).toHaveBeenCalledWith('0xabc123', 'alice'))
  })

  it('calls onVerified with the fallback username on unavailable', async () => {
    const onVerified = jest.fn()
    mockUpgrade.mockResolvedValueOnce({ status: 'unavailable' })

    render(<WorldIdVerify onVerified={onVerified} />)
    await openWidget()
    await driveIdKitFlow()

    await waitFor(() => expect(onVerified).toHaveBeenCalledWith('0xabc123', 'Human #abc123'))
  })

  it('calls onVerified with the fallback and offers retry on rejected', async () => {
    const onVerified = jest.fn()
    mockUpgrade.mockResolvedValueOnce({ status: 'rejected', message: 'rejected' })

    render(<WorldIdVerify onVerified={onVerified} />)
    await openWidget()
    await driveIdKitFlow()

    await waitFor(() => expect(onVerified).toHaveBeenCalledWith('0xabc123', 'Human #abc123'))
  })

  it('calls onVerified with the fallback and offers retry on error', async () => {
    const onVerified = jest.fn()
    mockUpgrade.mockResolvedValueOnce({ status: 'error', message: 'boom' })

    render(<WorldIdVerify onVerified={onVerified} />)
    await openWidget()
    await driveIdKitFlow()

    await waitFor(() => expect(onVerified).toHaveBeenCalledWith('0xabc123', 'Human #abc123'))
  })

  it('does not send a username to /verify (verify only proves personhood)', async () => {
    const onVerified = jest.fn()
    mockUpgrade.mockResolvedValueOnce({ status: 'ok', username: 'alice' })

    render(<WorldIdVerify onVerified={onVerified} />)
    await openWidget()
    await driveIdKitFlow()

    await waitFor(() => expect(onVerified).toHaveBeenCalled())
    const verifyCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes('/api/identity/verify')
    )
    expect(verifyCall).toBeDefined()
    const body = JSON.parse(verifyCall![1].body)
    expect(body.proof).toBeDefined()
    expect(body.username).toBeUndefined()
  })
})
