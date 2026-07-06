/**
 * Shared constants for MiniKit Wallet Auth (SIWE).
 *
 * The statement and expiration MUST match between the client (MiniKit.walletAuth)
 * and the server (verifySiweMessage) — the server rejects any payload whose
 * signed statement differs, so keep them sourced from this one module.
 */
export const WALLET_AUTH_STATEMENT =
  'Sign in to DJ Dreams to show your World App username in chat.'

/** How long a wallet-auth SIWE message remains valid. Embedded in the signed message. */
export const WALLET_AUTH_EXPIRATION_MS = 10 * 60 * 1000 // 10 minutes
