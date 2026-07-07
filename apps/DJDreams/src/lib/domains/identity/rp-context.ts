import { signRequest } from '@worldcoin/idkit/signing'
import { env } from '@/lib/env'
import type { RpContextResponse } from './types'

export function generateRpContext(action: string): RpContextResponse {
  const signingKey = env.rpSigningKey()
  const rpId = env.rpId()

  const { sig, nonce, createdAt, expiresAt } = signRequest({ signingKeyHex: signingKey, action })

  return {
    rp_id: rpId,
    sig,
    nonce,
    created_at: createdAt,
    expires_at: expiresAt,
  }
}
