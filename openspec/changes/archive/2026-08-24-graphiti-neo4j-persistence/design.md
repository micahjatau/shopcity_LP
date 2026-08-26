## Context

The current local setup has two memory backends: a manually created Neo4j container used by `scripts/graphiti/mcp-server.py`, and a persistent FalkorDB container containing prior bootstrap capsules. The MCP server only queries Neo4j `Episodic` nodes, so historical FalkorDB nodes are invisible. The Neo4j container has no mounts, making all newly written memories disposable if it is recreated.

## Goals / Non-Goals

**Goals:**

- Establish one documented canonical backend: Neo4j at `127.0.0.1:7687`, database `neo4j`, group `shopcity_LP`.
- Persist Neo4j data through a named Docker volume.
- Start dependency infrastructure deterministically before MCP.
- Migrate source memories without duplicates on repeated runs.
- Fail health checks when Neo4j is unreachable or the expected schema/data contract is unavailable.

**Non-Goals:**

- Replace the Graphiti MCP protocol.
- Introduce cloud memory infrastructure.
- Delete FalkorDB automatically; it remains available as a rollback/source backup until explicitly retired.

## Decisions

- Put Neo4j in the repository root `docker-compose.yml` with a named volume, healthcheck, and configurable credentials/port.
- Have `start-mcp.sh` use the repository Compose file and wait for the Neo4j Bolt endpoint before launching the MCP server. An already healthy externally managed endpoint remains supported.
- Convert source `SessionCapsule` and `Entity` records into idempotent `Episodic` records in `shopcity_LP`, preserving source graph, source UUID, original group, summary, and timestamps in content/metadata fields supported by the adapter.
- Use a stable source identifier in Neo4j and `MERGE` it during migration, so reruns are safe.
- Verify the canonical service with a health endpoint and a round-trip add/search check before declaring setup healthy.

## Migration / Rollback

1. Snapshot or retain the existing FalkorDB volume.
2. Start persistent Neo4j.
3. Run the migration once; rerunning is safe.
4. Verify count, searchability, and write persistence.
5. Retire FalkorDB only after an explicit backup decision.

Rollback is to stop the MCP server, point the adapter at the retained source backend, and remove only the newly migrated Neo4j volume if necessary. The source FalkorDB data is not modified by migration.

## Risks / Trade-offs

- Existing ad-hoc Neo4j containers can occupy port 7687; startup must report the conflict instead of silently connecting to an untracked instance.
- The lightweight adapter stores episode content rather than full Graphiti entity relationships; migration preserves source metadata and text but not vector indexes.
- Docker is required for the automatic local dependency path; direct externally managed Neo4j remains supported via environment variables.
