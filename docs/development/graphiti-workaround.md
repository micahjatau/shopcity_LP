# Graphiti Workaround

## Why this exists

Pi’s built-in MCP registry can start empty in this repo even when the local Graphiti server is healthy. When that happens, Graphiti memory search/write is still available through the local MCP HTTP endpoint.

## Current workaround

This repository keeps a project-level `.mcp.json` that points Pi at the local Graphiti server:

```json
{
  "mcpServers": {
    "graphiti-memory": {
      "url": "http://127.0.0.1:8000/mcp/"
    }
  }
}
```

The local Graphiti server is implemented in `scripts/graphiti/mcp-server.py` and can be started with `npm run graphiti:mcp` or `scripts/graphiti/start-mcp.sh`. It exposes:

- `GET /health` for a quick liveness check
- `POST /mcp/` for MCP traffic
- tools for `add_memory`, `search_nodes`, `search_memory_facts`, and `get_status`

## How to recover

1. Start the Graphiti MCP server with `scripts/graphiti/start-mcp.sh`.
2. Confirm the endpoint responds at `http://127.0.0.1:8000/health` and `http://127.0.0.1:8000/mcp/`.
3. Keep or restore the repo-root `.mcp.json` above.
4. Restart or reload Pi so it re-reads MCP config.
5. If Pi still shows no MCP tools, use the local HTTP endpoint directly until the registry reloads.

## Verification

A healthy setup should:

- return a successful MCP `initialize` response from `http://127.0.0.1:8000/mcp/`
- expose tools such as `add_memory`, `search_nodes`, `search_memory_facts`, and `get_status`
- allow both memory search and memory write to complete against the `shopcity_LP` group

## Notes

- Do not store secrets in `.mcp.json`.
- If the port changes, update the URL in `.mcp.json` and restart Pi.
- This workaround is only for local development; production or shared environments should use the appropriate managed MCP configuration.
