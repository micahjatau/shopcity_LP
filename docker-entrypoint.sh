#!/bin/sh
set -eu

mode="${1:-${SHOPCITY_RUNTIME:-api}}"

case "$mode" in
  api)
    exec node dist/src/main.js
    ;;
  worker)
    exec node dist/src/worker.js
    ;;
  --help|help)
    cat <<'EOF'
Usage: docker run shopcity-lp [api|worker|help]
  SHOPCITY_RUNTIME=api    Run the HTTP API
  SHOPCITY_RUNTIME=worker Run the background worker
EOF
    ;;
  *)
    echo "Unknown runtime: $mode" >&2
    exit 1
    ;;
esac
