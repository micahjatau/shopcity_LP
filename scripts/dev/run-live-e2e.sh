#!/usr/bin/env bash
set -euo pipefail

echo "Blocked: this legacy runner loads .env.local, flushes Redis, and deletes shared build outputs." >&2
echo "Use npm run e2e:live:full for the disposable Testcontainers-backed runner." >&2
exit 1
