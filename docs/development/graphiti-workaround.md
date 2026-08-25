# Graphiti local memory

## Canonical setup

Local Graphiti uses the repository Compose service `graphiti-neo4j` as its canonical backend:

- Neo4j Bolt: `bolt://127.0.0.1:7687`
- Database: `neo4j`
- Group: `shopcity_LP`
- Persistent volumes: `graphiti-neo4j-data` and `graphiti-neo4j-logs`
- MCP: `http://127.0.0.1:8000/mcp/`

Start it with:

```bash
npm run graphiti:mcp
```

The launcher starts Neo4j through the root `docker-compose.yml`, waits for Bolt connectivity, and only then starts the MCP server. Set `GRAPHITI_NEO4J_AUTOSTART=false` when connecting to an externally managed Neo4j instance. Connection values can be overridden with `GRAPHITI_NEO4J_URI`, `GRAPHITI_NEO4J_USER`, `GRAPHITI_NEO4J_PASSWORD`, and `GRAPHITI_NEO4J_DATABASE`.

## Migrating the former FalkorDB memory

The previous local setup stored bootstrap capsules in FalkorDB on port `6380`. Keep the `falkordb_data` volume as a source backup, start canonical Neo4j, then run:

```bash
npm run graphiti:migrate:falkordb
```

The migration reads `default_db`, writes all source records into `shopcity_LP`, and is idempotent using the original FalkorDB UUID. It does not modify or delete FalkorDB data. Override `GRAPHITI_FALKORDB_URL` or `GRAPHITI_FALKORDB_GRAPH` when the source differs.

## Verification and recovery

```bash
curl -fsS http://127.0.0.1:8000/health
npm run graphiti:migrate:falkordb
```

The health response must report Neo4j connectivity and a nonzero `episodicCount` after migration. If startup fails, inspect:

```bash
docker compose logs graphiti-neo4j
```

Do not run `docker compose down -v` for the local stack unless the Neo4j backup has been intentionally made; removing volumes destroys the canonical memory store. The retained FalkorDB volume is the rollback source until migration is confirmed.
