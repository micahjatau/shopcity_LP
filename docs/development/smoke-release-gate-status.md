# Smoke Release-Gate Status

## Automated gates

The following gates have passed in the current working tree:

- Source and test lint
- Typecheck and production builds
- Unit, E2E, integration, and critical-coverage suites
- OpenAPI lint/diff and Prisma validation
- Architecture and validation-scope checks
- Client typecheck
- Smoke evidence tests and Playwright smoke discovery
- Docker `actionlint` for staging and production workflows

## Explicit exceptions

The repository-wide format check reports four pre-existing dirty files:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/pr_review_1.md`
- `apps/web/test-results/.last-run.json`

These files were not reformatted because the smoke implementation must preserve unrelated working-tree changes. The smoke-owned files pass targeted formatting checks.

GitNexus incremental analysis currently reports a corrupted existing FTS index (`file_fts`). A maintainer must rebuild the local index before relying on a complete final blast-radius report. `detect_changes` currently reports no mapped changes.

## Operational gates still required

- Provision and validate the deterministic staging/production smoke tenant, fraud flag, device, users, cards, and spare cards.
- Set deployed frontend/backend provenance variables to the exact candidate SHA.
- Execute staging smoke and retain the evidence artifact.
- Review staging evidence, then execute the manually approved production workflow.
- Resolve any reconciliation failure before rerun; never bypass the production safety lock.
