const MAX_USERNAME_LENGTH = 32
const FALLBACK_USERNAME_PATTERN = /^Human #[0-9a-fA-F]{6}$/

export function sanitizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_USERNAME_LENGTH) return null

  return trimmed
}

export function defaultDisplayName(nullifier: string): string {
  return `Human #${nullifier.slice(-6)}`
}

export function isFallbackUsername(username: string): boolean {
  return FALLBACK_USERNAME_PATTERN.test(username)
}

export function resolveDisplayName(nullifier: string, username?: unknown): string {
  return sanitizeUsername(username) ?? defaultDisplayName(nullifier)
}
