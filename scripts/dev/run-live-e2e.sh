#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

# Load the first occurrence of each live key from .env.local.
eval "$(node "$ROOT_DIR/scripts/dev/export-live-env.mjs" "$ENV_FILE" \
  DATABASE_URL REDIS_URL SESSION_SECRET CSRF_SECRET \
  SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY \
  DEFAULT_PUBLIC_TENANT_ID DEFAULT_PUBLIC_BRANCH_ID CORS_ORIGIN_ALLOWLIST \
  SHOPCITY_TIMEZONE RECEIPT_WEEK_START_DAY DEFAULT_EARN_RATE_BPS \
  DEFAULT_ADMIN_PASSWORD)"

: "${DEVICE_ATTESTATION_KEK:=shopcity-dev-device-attestation-kek}"
export DEVICE_ATTESTATION_KEK
export SHOPCITY_BACKEND_URL="http://127.0.0.1:3000"
export SHOPCITY_LIVE_E2E="1"
WEB_PORT="3200"
export PLAYWRIGHT_BASE_URL="http://127.0.0.1:${WEB_PORT}"
export PLAYWRIGHT_SKIP_WEBSERVER="1"

backend_log="/tmp/shopcity-live-backend.log"
web_log="/tmp/shopcity-live-web.log"
backend_pid=""
web_pid=""
cleanup() {
  if [[ -n "$web_pid" ]]; then kill "$web_pid" 2>/dev/null || true; fi
  if [[ -n "$backend_pid" ]]; then kill "$backend_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

# Prepare schema + seed data before starting app processes.
cd "$ROOT_DIR"
if command -v redis-cli >/dev/null 2>&1; then
  redis-cli -u "$REDIS_URL" FLUSHALL >/dev/null
fi
npm run e2e:live:prepare
rm -rf "$ROOT_DIR/dist" "$ROOT_DIR/apps/web/.next"
npm run build
npm --prefix apps/web run build

nohup bash -lc 'NODE_ENV=development npm run start:prod' >"$backend_log" 2>&1 &
backend_pid=$!

ready_backend=0
for _ in $(seq 1 120); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/v1/auth/me || true)
  if [[ "$code" == "401" || "$code" == "200" ]]; then
    ready_backend=1
    break
  fi
  sleep 2
done

if [[ "$ready_backend" -ne 1 ]]; then
  echo "Backend failed to become ready" >&2
  sed -n '1,120p' "$backend_log" >&2 || true
  exit 1
fi

nohup bash -lc 'NODE_ENV=production SHOPCITY_BACKEND_URL=http://127.0.0.1:3000 npm --prefix apps/web run start -- --port 3200' >"$web_log" 2>&1 &
web_pid=$!

ready_web=0
for _ in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/login || true)
  if [[ "$code" == "200" ]]; then
    ready_web=1
    break
  fi
  sleep 2
done

if [[ "$ready_web" -ne 1 ]]; then
  echo "Web failed to become ready" >&2
  sed -n '1,120p' "$web_log" >&2 || true
  exit 1
fi

cd "$ROOT_DIR/apps/web"
PLAYWRIGHT_BASE_URL="$PLAYWRIGHT_BASE_URL" \
PLAYWRIGHT_SKIP_WEBSERVER="$PLAYWRIGHT_SKIP_WEBSERVER" \
SHOPCITY_LIVE_E2E="$SHOPCITY_LIVE_E2E" \
SHOPCITY_BACKEND_URL="$SHOPCITY_BACKEND_URL" \
  npx playwright test --config ./playwright.config.ts tests/live-backend-e2e.spec.ts --reporter=list
