#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv-graphiti"
SCRIPT="$ROOT_DIR/scripts/graphiti/mcp-server.py"

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install mcp neo4j
fi

exec "$VENV_DIR/bin/python" "$SCRIPT"
