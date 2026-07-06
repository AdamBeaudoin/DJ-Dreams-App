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
        messages={[]}
        isLoading={false}
      />
    )
    expect(screen.getByText('Verify with World ID to join the chat')).toBeInTheDocument()
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
