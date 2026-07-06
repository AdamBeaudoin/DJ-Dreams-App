-- DJ Dreams — full schema for a fresh Supabase project.
-- Matches the code in apps/DJDreams/src/lib/domains/* (post PR #12 refactor).
-- Run this in the Supabase SQL editor (or via psql) on a NEW project.
-- Idempotent: safe to re-run.

-- ============================================================
-- messages — chat messages (written only by the server via
-- service role; read by browsers via anon key for realtime)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT true,
  -- legacy column kept for backward compatibility with old rows
  nullifier_hash TEXT,
  session_nullifier TEXT,
  is_moderated BOOLEAN NOT NULL DEFAULT false,
  is_boosted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages (user_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Browsers subscribe to INSERTs with the anon key, which requires SELECT.
DROP POLICY IF EXISTS "anon can read messages" ON messages;
CREATE POLICY "anon can read messages" ON messages
  FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policies: writes only happen server-side with the
-- service role key (which bypasses RLS).

-- ============================================================
-- verified_sessions — one row per verified World ID nullifier
-- (server-only; used by requireSession in every API route)
-- ============================================================
CREATE TABLE IF NOT EXISTS verified_sessions (
  nullifier TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE verified_sessions ENABLE ROW LEVEL SECURITY;
-- No policies: service-role access only.

-- ============================================================
-- payment_references — one-time payment references for
-- tips/boosts (server-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_references (
  id TEXT PRIMARY KEY,
  nullifier TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'tip',
  used BOOLEAN NOT NULL DEFAULT false,
  transaction_id TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_refs_lookup
  ON payment_references (nullifier, purpose, used, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_refs_donor
  ON payment_references (nullifier) WHERE used = true;

ALTER TABLE payment_references ENABLE ROW LEVEL SECURITY;
-- No policies: service-role access only.

-- ============================================================
-- Realtime: broadcast INSERTs on messages to subscribed clients
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
  WHEN duplicate_object THEN NULL; -- already in the publication
END $$;
