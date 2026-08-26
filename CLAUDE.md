## Bootstrap Notes

- GitHub CLI is available via `gh`; check auth with `gh auth status`.
- Vercel CLI is available via `npm exec -- vercel` even when `vercel` is not on PATH; check auth with `npm exec -- vercel whoami`.
- `SENTRY_DSN` is present in `.env.local` for local Sentry configuration.
- The repo test runner is Jest (`./node_modules/.bin/jest` / `npm run test`).
- Playwright is available via the web package (`npm --prefix apps/web exec -- playwright --version`).
- Semgrep CLI is installed (`semgrep --version`).
- Graphiti memory access uses the running MCP server; treat read/search and ingest/write health separately.
- Graphiti Codex auth is available via `pi auth print-bearer-token --provider openai-codex`.
- A local Graphiti MCP server is reachable at `http://127.0.0.1:8000/health` and `http://127.0.0.1:8000/mcp` when the standalone container is running.

## Bootstrap Expectations

- Capture repo branch, working-tree state, and whether unrelated changes must be preserved.
- Select the relevant OpenSpec before implementation; if none fits, update or create one first.
- Use GitNexus CLI first for impact/context on code changes and report blast radius before editing affected symbols.
- Treat Graphiti as historical context only and distinguish retrieval from write/processing health.
- Session readiness is task-specific: missing irrelevant interfaces do not make the session degraded.
- Prefer the repository’s actual verification runner and commands over generic tool names.

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **shopcity_LP** (11322 symbols, 18278 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "master"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource                                     | Use for                                  |
| -------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/shopcity_LP/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/shopcity_LP/clusters`       | All functional areas                     |
| `gitnexus://repo/shopcity_LP/processes`      | All execution flows                      |
| `gitnexus://repo/shopcity_LP/process/{name}` | Step-by-step execution trace             |

## CLI

| Task                                         | Read this skill file                                        |
| -------------------------------------------- | ----------------------------------------------------------- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"  | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"             | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md`       |
| Rename / extract / split / refactor          | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference           | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md`           |
| Index, status, clean, wiki CLI commands      | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->
