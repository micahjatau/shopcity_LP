#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv-graphiti"
SCRIPT="$ROOT_DIR/scripts/graphiti/mcp-server.py"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install mcp neo4j redis
fi

# The repository Compose service is the canonical local Neo4j instance. Set
# GRAPHITI_NEO4J_AUTOSTART=false when using an externally managed Neo4j.
if [[ "${GRAPHITI_NEO4J_AUTOSTART:-true}" == "true" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Graphiti requires Docker for local Neo4j; install Docker or set GRAPHITI_NEO4J_AUTOSTART=false." >&2
    exit 1
  fi
  docker compose -f "$COMPOSE_FILE" up -d graphiti-neo4j
fi

if ! "$VENV_DIR/bin/python" - <<'PY'
import os
import sys
from neo4j import GraphDatabase

uri = os.environ.get('GRAPHITI_NEO4J_URI', 'bolt://127.0.0.1:7687')
user = os.environ.get('GRAPHITI_NEO4J_USER', 'neo4j')
password = os.environ.get('GRAPHITI_NEO4J_PASSWORD', 'shopcity-graphiti')
database = os.environ.get('GRAPHITI_NEO4J_DATABASE', 'neo4j')
try:
    with GraphDatabase.driver(uri, auth=(user, password)) as driver:
        driver.verify_connectivity()
        with driver.session(database=database) as session:
            session.run('RETURN 1').consume()
except Exception as exc:
    print(f'Neo4j is not ready at {uri}: {exc}', file=sys.stderr)
    sys.exit(1)
PY
then
  for attempt in $(seq 1 "${GRAPHITI_NEO4J_WAIT_ATTEMPTS:-30}"); do
    if "$VENV_DIR/bin/python" - <<'PY'
import os
from neo4j import GraphDatabase

with GraphDatabase.driver(
    os.environ.get('GRAPHITI_NEO4J_URI', 'bolt://127.0.0.1:7687'),
    auth=(os.environ.get('GRAPHITI_NEO4J_USER', 'neo4j'), os.environ.get('GRAPHITI_NEO4J_PASSWORD', 'shopcity-graphiti')),
) as driver:
    driver.verify_connectivity()
PY
    then
      break
    fi
    if [[ "$attempt" == "${GRAPHITI_NEO4J_WAIT_ATTEMPTS:-30}" ]]; then
      echo "Neo4j did not become ready after $attempt attempts. Check docker compose logs graphiti-neo4j and port configuration." >&2
      exit 1
    fi
    sleep 2
  done
fi

exec "$VENV_DIR/bin/python" "$SCRIPT"
