-- Session security: the cookie used to contain the raw nullifier, which is
-- public (it appears as user_id on every chat message) — anyone could forge
-- a session. Sessions are now keyed by a random opaque token.
-- Idempotent: safe to re-run.

ALTER TABLE verified_sessions
  ADD COLUMN IF NOT EXISTS session_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_verified_sessions_token
  ON verified_sessions (session_token);
