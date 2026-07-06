-- Wallet auth: persist the SIWE-verified World App wallet address alongside the
-- session so the server can tie a wallet address to a nullifier. Optional column
-- — the verify-wallet route degrades gracefully to a username-only update if this
-- migration has not been applied. Idempotent: safe to re-run.

ALTER TABLE verified_sessions
  ADD COLUMN IF NOT EXISTS wallet_address TEXT;
