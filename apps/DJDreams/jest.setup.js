// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    return <img {...props} />
  },
}))

// Mock react-player
jest.mock('react-player/youtube', () => ({
  __esModule: true,
  default: ({ onReady, onProgress, onDuration }) => {
    // Simulate component mounting and calling callbacks
    setTimeout(() => {
      onReady && onReady()
      onDuration && onDuration(180) // 3 minutes
      onProgress && onProgress({ played: 0.5, playedSeconds: 90 })
    }, 100)
    
    return <div data-testid="react-player">Mock YouTube Player</div>
  },
}))

// Mock bad-words (to avoid ESM transform issues in tests)
jest.mock('bad-words', () => {
  class MockFilter {
    constructor() {
      this.custom = []
    }
    addWords(...words) {
      this.custom.push(...words.flat())
    }
    // Very small profanity list for tests
    isProfane(text) {
      const list = ['damn', 'spam', 'fuck', 'shit', 'pussy', 'dick', 'cock', 'ass', 'bitch', 'whore', 'slut', 'nigger', 'fagot', ...this.custom]
      const pattern = new RegExp(`\\b(${list.map(w => w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'i')
      return pattern.test(text)
    }
    clean(text) {
      return text.replace(/damn|spam/gi, '****')
    }
  }
  return { Filter: MockFilter }
})

// Mock MiniKit
jest.mock('@worldcoin/minikit-js', () => ({
  MiniKit: {
    install: jest.fn(),
    isInstalled: jest.fn().mockReturnValue(false),
  },
}))

// Mock window.document methods
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Suppress console errors for known issues in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    return originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
}) 