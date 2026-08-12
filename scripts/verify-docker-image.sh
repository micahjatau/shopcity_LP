#!/bin/sh
set -eu

IMAGE_TAG="${1:-shopcity-lp:local}"
RELEASE_SHA="${RELEASE_SHA:-dev}"
RELEASE_VERSION="${RELEASE_VERSION:-0.0.0-dev}"
DATABASE_URL="${DATABASE_URL:-postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity_test?schema=public}"
REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
SESSION_SECRET="${SESSION_SECRET:-test-session-secret-test-session-secret}"
CSRF_SECRET="${CSRF_SECRET:-test-csrf-secret-test-csrf-secret}"
DEVICE_ATTESTATION_KEK="${DEVICE_ATTESTATION_KEK:-test-device-attestation-kek-test-device-attestation-kek}"
DEFAULT_PUBLIC_TENANT_ID="${DEFAULT_PUBLIC_TENANT_ID:-00000000-0000-0000-0000-000000000001}"
DEFAULT_PUBLIC_BRANCH_ID="${DEFAULT_PUBLIC_BRANCH_ID:-00000000-0000-0000-0000-000000000002}"
CORS_ORIGIN_ALLOWLIST="${CORS_ORIGIN_ALLOWLIST:-http://localhost:3000,http://127.0.0.1:3000}"
SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-test-anon-key}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-test-service-role-key}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for verify-docker-image" >&2
  exit 1
fi

docker build \
  --build-arg RELEASE_SHA="$RELEASE_SHA" \
  --build-arg RELEASE_VERSION="$RELEASE_VERSION" \
  -t "$IMAGE_TAG" \
  .

docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  -e REDIS_URL="$REDIS_URL" \
  -e SESSION_SECRET="$SESSION_SECRET" \
  -e CSRF_SECRET="$CSRF_SECRET" \
  -e DEVICE_ATTESTATION_KEK="$DEVICE_ATTESTATION_KEK" \
  -e DEFAULT_PUBLIC_TENANT_ID="$DEFAULT_PUBLIC_TENANT_ID" \
  -e DEFAULT_PUBLIC_BRANCH_ID="$DEFAULT_PUBLIC_BRANCH_ID" \
  -e CORS_ORIGIN_ALLOWLIST="$CORS_ORIGIN_ALLOWLIST" \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  "$IMAGE_TAG" help >/tmp/shopcity-docker-help.txt

grep -q "Run the HTTP API" /tmp/shopcity-docker-help.txt
grep -q "Run the background worker" /tmp/shopcity-docker-help.txt

docker run --rm --entrypoint sh "$IMAGE_TAG" -lc 'test -f dist/src/main.js && test -f dist/src/worker.js'
