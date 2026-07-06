# Supabase Setup for DJ Dreams

## 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL, anon key, and **service role key**
   (Project Settings → API)

## 2. Environment Variables
Add to `apps/DJDreams/.env.local` (and to Vercel for deployments):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
The service role key is server-only — all API routes (sessions, chat,
payments) require it. Never expose it to the browser.

## 3. Database Schema
Run [`supabase/migrations/001_full_schema.sql`](../../supabase/migrations/001_full_schema.sql)
in the Supabase SQL editor. It creates:

- `messages` — chat messages (includes `is_boosted`, `session_nullifier`)
- `verified_sessions` — one row per verified World ID nullifier
- `payment_references` — one-time payment references for tips/boosts

plus RLS policies (anon may only SELECT `messages`; everything else is
service-role-only) and adds `messages` to the realtime publication.

The script is idempotent — safe to re-run on an existing project.

## 4. Real-time
Browsers subscribe to `messages` INSERTs with the anon key (already enabled
by the migration). Note: realtime is intentionally disabled on localhost —
dev uses 10s polling instead.
