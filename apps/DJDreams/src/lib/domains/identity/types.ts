export interface VerifiedSession {
  nullifier: string
  username: string
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
