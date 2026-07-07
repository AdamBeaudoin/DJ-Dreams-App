-- ============================================================
-- 004_drop_boost — remove the retired "boost message" feature
-- ============================================================
-- Boost was backend-complete but had no UI entry point after the redesign,
-- so it was dead surface area. The chat send route, repository, types, and
-- client no longer reference is_boosted. Drop the column to keep the schema
-- honest. Existing rows lose the flag (it was always false in practice).
-- ============================================================

ALTER TABLE messages DROP COLUMN IF EXISTS is_boosted;
