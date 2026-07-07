import { render, screen } from '@testing-library/react'
import { ChatEmptyState } from '../chat-empty-state'

describe('ChatEmptyState', () => {
  it('shows a friendly prompt when the user is verified', () => {
    render(<ChatEmptyState isVerified={true} />)
    expect(screen.getByText('No messages yet')).toBeInTheDocument()
    expect(screen.getByText('Be the first to say something!')).toBeInTheDocument()
    expect(screen.queryByText(/Verify you are human/i)).not.toBeInTheDocument()
  })

  it('prompts verification when the user is not verified', () => {
    render(<ChatEmptyState isVerified={false} />)
    expect(screen.getByText('No messages yet')).toBeInTheDocument()
    expect(screen.getByText('Verify you are human to join the chat')).toBeInTheDocument()
  })

  it('is announced politely to assistive tech', () => {
    render(<ChatEmptyState isVerified={true} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
