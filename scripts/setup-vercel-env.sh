#!/usr/bin/env bash
# Sync DJ Dreams environment variables to Vercel (Production, Preview, Development).
#
# Prerequisites:
#   1. vercel login   (or npx vercel@latest login — device flow)
#   2. Export secrets before running:
#        export RP_SIGNING_KEY='...'        # Developer Portal → RP → Rotate signing key (shown once)
#        export DEV_PORTAL_API_KEY='...'    # Developer Portal → Team → API keys → Create
#        export SUPABASE_SERVICE_ROLE_KEY='...'  # Supabase dashboard → Project Settings → API → service_role
#
# Usage:
#   cd /Users/test/DJ-Dreams-App
#   export RP_SIGNING_KEY='...'
#   export DEV_PORTAL_API_KEY='...'
#   export SUPABASE_SERVICE_ROLE_KEY='...'
#   ./scripts/setup-vercel-env.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Install Vercel CLI: npm i -g vercel  (or use npx vercel@latest)"
  exit 1
fi

if [[ -z "${RP_SIGNING_KEY:-}" ]]; then
  echo "Missing RP_SIGNING_KEY. Rotate in World Developer Portal → your RP (rp_b4def55ab4fb2748) → Signing key."
  exit 1
fi

if [[ -z "${DEV_PORTAL_API_KEY:-}" ]]; then
  echo "Missing DEV_PORTAL_API_KEY. Create in World Developer Portal → Team → API keys."
  exit 1
fi

# Link project if .vercel/project.json is missing
if [[ ! -f .vercel/project.json ]]; then
  vercel link --yes --project dj-dreams-app --scope adams-projects80
fi

add_env() {
  local name="$1"
  local value="$2"
  for env in production preview development; do
    printf '%s' "$value" | vercel env add "$name" "$env" --force
  done
  echo "✓ $name"
}

# Known values (non-secret)
add_env NEXT_PUBLIC_APP_ID "app_c40499d1b2b1103c51a7da0f396c8114"
add_env RP_ID "rp_b4def55ab4fb2748"
add_env NEXT_PUBLIC_SUPABASE_URL "https://cvxrjzqzonsyhxodtlqr.supabase.co"
add_env NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2eHJqenF6b25zeWh4b2R0bHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjI2MzMsImV4cCI6MjA5ODkzODYzM30.fftovipU08EciXu60zhZERKk4etyYr6bbMSWKEPXH-s"
add_env NEXT_PUBLIC_TIP_RECIPIENT_ADDRESS "0x693d8dced3be29222691123656daea9f18e95f4b"
add_env NEXT_PUBLIC_TIP_AMOUNT "1"

# Secrets from environment (export before running)
if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Missing SUPABASE_SERVICE_ROLE_KEY. Find in Supabase dashboard → Project Settings → API → service_role key."
  exit 1
fi
add_env SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY"
add_env RP_SIGNING_KEY "$RP_SIGNING_KEY"
add_env DEV_PORTAL_API_KEY "$DEV_PORTAL_API_KEY"

echo ""
echo "Done. Redeploy production:"
echo "  vercel --prod"
echo "Or: Vercel dashboard → Deployments → Redeploy (with existing build cache cleared optional)"
