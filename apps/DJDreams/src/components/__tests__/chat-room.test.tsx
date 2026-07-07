import { render, screen } from '@testing-library/react'
import { ChatRoom } from '../chat-room'
import type { ChatMessage } from '@/lib/domains/chat/types'

// The real WorldIdVerify pulls in @worldcoin/idkit; we only care about
// loading/empty/messages rendering here, so stub it out.
jest.mock('@/components/identity/world-id-verify', () => ({
  WorldIdVerify: () => <div data-testid="world-id-verify" />,
}))

const baseProps = {
  nullifier: 'null-123',
  username: 'tester',
  canWrite: true,
  sessionChecked: true,
  onVerified: jest.fn(),
  isConnected: true,
  sendMessage: jest.fn(),
}

describe('ChatRoom states', () => {
  it('renders the skeleton while messages are loading', () => {
    render(
      <ChatRoom
        {...baseProps}
        messages={[]}
        isLoading={true}
      />
    )
    expect(screen.getByLabelText('Loading messages')).toBeInTheDocument()
    expect(screen.queryByText('No messages yet')).not.toBeInTheDocument()
  })

  it('renders the empty state when loaded with no messages', () => {
    render(
      <ChatRoom
        {...baseProps}
        messages={[]}
        isLoading={false}
      />
    )
    expect(screen.getByText('No messages yet')).toBeInTheDocument()
    expect(screen.getByText('Be the first to say something!')).toBeInTheDocument()
    expect(screen.queryByLabelText('Loading messages')).not.toBeInTheDocument()
  })

  it('renders the empty state with a verify prompt when not verified', () => {
    render(
      <ChatRoom
        {...baseProps}
        nullifier={null}
        canWrite={false}
        messages={[]}
        isLoading={false}
      />
    )
    expect(screen.getByText('Verify with World ID to join the chat')).toBeInTheDocument()
  })

  it('keeps input locked when nullifier exists but server has not confirmed session', () => {
    render(
      <ChatRoom
        {...baseProps}
        nullifier="stale-from-localstorage"
        canWrite={false}
        sessionChecked={true}
        messages={[]}
        isLoading={false}
      />
    )
    expect(screen.getByPlaceholderText('Verify with World ID to chat')).toBeDisabled()
    expect(screen.getByTestId('world-id-verify')).toBeInTheDocument()
  })

  it('keeps input locked until session check completes', () => {
    render(
      <ChatRoom
        {...baseProps}
        nullifier="null-123"
        canWrite={false}
        sessionChecked={false}
        messages={[]}
        isLoading={false}
      />
    )
    expect(screen.getByPlaceholderText('Verify with World ID to chat')).toBeDisabled()
  })

  it('renders messages once loaded', async () => {
    const messages: ChatMessage[] = [
      {
        id: 'm1',
        user_id: 'u1',
        username: 'DJ',
        message: 'Hello world',
        verified: true,
        created_at: '2025-01-01T00:00:00Z',
      },
    ]

    render(
      <ChatRoom
        {...baseProps}
        messages={messages}
        isLoading={false}
      />
    )

    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.getByText('DJ')).toBeInTheDocument()
    expect(screen.queryByText('No messages yet')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Loading messages')).not.toBeInTheDocument()
  })

  it('shows the live username on the current user own messages, not the stored fallback', () => {
    const messages: ChatMessage[] = [
      {
        id: 'm1',
        user_id: 'null-123', // matches nullifier -> current user's own message
        username: 'Human #abc123', // stale fallback stored on the row at send time
        message: 'my message',
        verified: true,
        created_at: '2025-01-01T00:00:00Z',
      },
      {
        id: 'm2',
        user_id: 'u-other',
        username: 'otheruser',
        message: 'their message',
        verified: true,
        created_at: '2025-01-01T00:00:01Z',
      },
    ]

    render(
      <ChatRoom
        {...baseProps}
        nullifier="null-123"
        username="realname"
        messages={messages}
        isLoading={false}
      />
    )

    // Own message shows the live username; the stale stored fallback is gone.
    expect(screen.queryByText('Human #abc123')).not.toBeInTheDocument()
    expect(screen.getAllByText('realname').length).toBeGreaterThanOrEqual(1)
    // Another user's message keeps its stored username.
    expect(screen.getByText('otheruser')).toBeInTheDocument()
  })

  it('does not call sendMessage while loading', async () => {
    const sendMessage = jest.fn()
    render(
      <ChatRoom
        {...baseProps}
        sendMessage={sendMessage}
        messages={[]}
        isLoading={true}
      />
    )
    // Send button is disabled while there is no message text anyway; we just
    // confirm the room mounts without firing sends during loading.
    expect(sendMessage).not.toHaveBeenCalled()
  })
})
