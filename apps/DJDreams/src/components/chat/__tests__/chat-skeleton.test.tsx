import { render, screen } from '@testing-library/react'
import { ChatSkeleton } from '../chat-skeleton'

describe('ChatSkeleton', () => {
  it('renders an accessible loading status', () => {
    render(<ChatSkeleton />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByLabelText('Loading messages')).toBeInTheDocument()
    expect(screen.getByText(/Loading messages/i)).toBeInTheDocument()
  })

  it('renders a row of placeholder bars so the layout is not empty', () => {
    const { container } = render(<ChatSkeleton />)
    // Four skeleton rows, each with an avatar/name bar and a message bar
    const rows = container.querySelectorAll('.space-y-3 > div')
    expect(rows.length).toBeGreaterThanOrEqual(4)
  })
})
