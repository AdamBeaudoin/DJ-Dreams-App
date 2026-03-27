import { signRequest } from '@worldcoin/idkit/signing'
import type { RpContextResponse } from './types'

export function generateRpContext(action: string): RpContextResponse {
  const signingKey = process.env.RP_SIGNING_KEY
  const rpId = process.env.RP_ID

  if (!signingKey) {
    throw new Error('RP_SIGNING_KEY not configured')
  }
  if (!rpId) {
    throw new Error('RP_ID not configured')
  }

  const { sig, nonce, createdAt, expiresAt } = signRequest(action, signingKey)

  return {
    rp_id: rpId,
    sig,
    nonce,
    created_at: createdAt,
    expires_at: expiresAt,
  }
}
