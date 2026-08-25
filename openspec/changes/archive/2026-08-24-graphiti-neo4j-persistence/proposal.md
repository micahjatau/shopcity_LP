## Why

The repo-local Graphiti MCP adapter currently connects to an ad-hoc Neo4j container without a persistent volume, while historical session capsules remain in a separate FalkorDB graph. A fresh session therefore reports an empty memory store and may require manual rewiring before use.

## What Changes

- Make Neo4j a first-class root Compose service with a named persistent data volume and healthcheck.
- Make the Graphiti launcher start and verify Neo4j before starting the MCP server, with bounded retries and actionable diagnostics.
- Migrate recoverable local FalkorDB session memories into the canonical Neo4j `shopcity_LP` namespace.
- Add an idempotent migration/verification path and document the canonical backend, namespace, backup, and recovery procedure.
- Keep the MCP adapter’s search/write behavior compatible with existing Graphiti tools.

## Capabilities

### New Capabilities

- `graphiti-neo4j-persistence`: persistent, self-starting local Graphiti memory backed by Neo4j.

### Modified Capabilities

-

## Impact

Affected areas include `docker-compose.yml`, Graphiti startup and migration scripts, Graphiti development documentation, and local Neo4j/FalkorDB data. No application financial or user-facing runtime behavior changes.
