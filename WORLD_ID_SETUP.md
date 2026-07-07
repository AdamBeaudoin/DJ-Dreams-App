# World ID Setup Guide for DJ Dreams

## Overview

DJ Dreams uses World ID to gate chat to verified humans. The flow has two parts:

1. **World ID verify (IDKit, RP-signed)** — proves personhood and returns a
   `nullifier`. The session starts with a fallback display name `Human #xxxxxx`.
2. **MiniKit Wallet Auth (SIWE)** — runs right after verify inside World App and
   upgrades the session to the user's real **World App username** (e.g. `alice`)
   plus their wallet address. The server resolves the username from the
   SIWE-verified wallet address via World's public usernames service, so it does
   not depend on `MiniKit.user` being populated (that state is asynchronous and
   unreliable right after `walletAuth`). Outside World App, the fallback name is
   kept and chat still works.

> Per Worldcoin guidance: World ID verify is a personhood gate, **not** a login.
   The username is resolved from the wallet address after `walletAuth`
   (`MiniKit.getUserByAddress` client-side; World's public usernames service
   server-side), never from the verify proof.

## Prerequisites

- A World app in **Managed** mode on the [World Developer Portal](https://developer.worldcoin.org/)
- World App installed (for end-to-end testing)
- Vercel project + Supabase project configured

## Credentials

Create the app and an action in the Developer Portal, then collect:

| Variable | What it is | Where |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_ID` | World app id, e.g. `app_xxx` | Portal → app |
| `RP_ID` | Relying-party id, e.g. `rp_xxx` | Portal → app (Managed mode) |
| `RP_SIGNING_KEY` | RP ECDSA signing key (hex) | Portal → app → signing key |
| `DEV_PORTAL_API_KEY` | Developer Portal API key | Portal → account → API keys |

The **action id** used by the app is `dj-dreams-chat-verification` (see
`src/components/identity/world-id-verify.tsx` and
`src/app/api/identity/rp-context/route.ts`). Create that exact action in the
portal (one verification per person, Orb or Device level as desired).

## Environment variables

Set these in Vercel (Project → Settings → Environment Variables) and locally in
`apps/DJDreams/.env.local`:

```
NEXT_PUBLIC_APP_ID=app_xxx
RP_ID=rp_xxx
RP_SIGNING_KEY=<hex signing key>
DEV_PORTAL_API_KEY=<dev portal api key>
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
NEXT_PUBLIC_TIP_RECIPIENT_ADDRESS=0x...
NEXT_PUBLIC_TIP_AMOUNT=1
```

Server-only vars (`RP_ID`, `RP_SIGNING_KEY`, `DEV_PORTAL_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`) must never be exposed to the browser. All access
goes through `src/lib/env.ts`, which fails fast with `Missing env vars: X` if a
required var is unset.

## How the username flow works

```
Verify with World ID
  └─ POST /api/identity/rp-context   (RP-signed context for IDKit)
  └─ IDKit verify                     (returns nullifier)
  └─ POST /api/identity/verify        (creates session "Human #xxxxxx" + cookie)
  └─ MiniKit.walletAuth               (SIWE prompt inside World App)
       └─ POST /api/identity/nonce    (sets HMAC-signed httpOnly nonce cookie)
       └─ POST /api/identity/verify-wallet
            (verifies SIWE, resolves username from payload.address via the
             World public usernames service, upgrades the session)
  └─ GET /api/identity/session        (client syncs authoritative username on mount)
```

The SIWE nonce is stored in an **HMAC-signed httpOnly cookie** (not in-memory),
so it works across serverless instances. The cookie is cleared on consume
(single-use). The HMAC key is derived (domain-separated) from `RP_SIGNING_KEY`,
so no extra env var is required.

The username is resolved **server-side** in `/api/identity/verify-wallet` from
the SIWE-verified `payload.address` via World's public usernames service
(`GET https://usernames.worldcoin.org/api/v1/:address`, no auth). The
client also resolves via `MiniKit.getUserByAddress(finalPayload.address)` as a
hint, but the server's lookup is authoritative — it does not depend on
`MiniKit.user` being populated. If the service has no record for the address or
is unreachable, the session keeps the `Human #xxxxxx` fallback and chat still
works.

If the user rejects walletAuth, isn't in World App, or the upgrade errors, the
UI surfaces a clear toast with a retry action and keeps the fallback name — it
never claims success on failure.

## Testing

1. **Outside World App (web):** Verify succeeds; chat works as `Human #xxxxxx`;
   a toast explains the username is available in World App.
2. **Inside World App:** Verify → walletAuth prompt → chat shows the real World
   App username.
3. **Reload:** `GET /api/identity/session` syncs the server username into the
   UI; a stale/expired cookie clears the local session.

## Production checklist

- [ ] Production (non-staging) App ID and RP credentials set in Vercel
- [ ] Action `dj-dreams-chat-verification` created in the portal
- [ ] Supabase migrations `001`–`004` applied
- [ ] Rate limiting active on `/api/chat/send` (per-nullifier) and identity
      endpoints
- [ ] End-to-end verify → walletAuth → chat tested inside World App

## Troubleshooting

- **`Missing env vars: X`** — the named var is empty/unset in the current
  environment. Add it and redeploy.
- **`Verification failed`** — the portal action id doesn't match
  `dj-dreams-chat-verification`, or the user already verified for this action.
- **Username stays `Human #xxxxxx`** — walletAuth didn't complete, or the server
  couldn't resolve a username for the SIWE wallet address (the public usernames
  service returned no record or was unreachable). Inside World App, tap "Connect
  username" in the toast to retry walletAuth. If it persists, confirm walletAuth
  succeeds and that `https://usernames.worldcoin.org` is reachable from the
  server. The current user's own past messages are remapped to their live
  username in the UI, but other users' old messages keep the name they sent with.
- **`Invalid or expired nonce`** — the SIWE nonce cookie was missing/expired.
  Re-trigger walletAuth to mint a fresh nonce.
