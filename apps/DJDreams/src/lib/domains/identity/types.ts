export interface VerifiedSession {
  nullifier: string
  username: string
  /** SIWE-verified World App wallet address (set after wallet auth). Optional until migration 003 is applied. */
  wallet_address?: string | null
  /** Random opaque token stored in the session cookie. Never expose in API responses. */
  session_token: string
  created_at: string
  last_seen_at: string
}

export interface RpContextResponse {
  rp_id: string
  sig: string
  nonce: string
  created_at: number
  expires_at: number
}
