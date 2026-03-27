const MAX_FREE_SKIPS = 3

function getSkipKey(): string {
  const today = new Date().toISOString().slice(0, 10)
  return `dj-dreams-skips-${today}`
}

export function getSkipCount(): number {
  try {
    return parseInt(localStorage.getItem(getSkipKey()) || '0', 10)
  } catch {
    return 0
  }
}

export function incrementSkipCount(): void {
  try {
    const count = getSkipCount()
    localStorage.setItem(getSkipKey(), String(count + 1))
  } catch {}
}

export function canSkip(isDonor: boolean): boolean {
  if (isDonor) return true
  return getSkipCount() < MAX_FREE_SKIPS
}
