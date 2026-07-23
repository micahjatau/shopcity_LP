## Context

The current CI review shows three recurring failure sources: type-aware lint violations in worker tests, formatting drift introduced after a cleanup commit, and GitNexus scripts that depend on a binary not guaranteed in clean CI. The change should make verification deterministic without changing product behavior.

## Goals / Non-Goals

**Goals:**
- Make the verification path reproducible after `npm ci`.
- Fail fast on static checks before slower jobs begin.
- Cancel superseded runs for the same branch or PR.
- Align repository guidance with actual `lint` and `lint:fix` behavior.

**Non-Goals:**
- Change application features or runtime behavior.
- Replace the CI platform.
- Expand scope beyond format, lint, typecheck, and GitNexus reliability.

## Decisions

- Add a repo-local fast verification command and have CI use it for the static gate.
- Split the workflow into static and slower stages instead of one sequential monolith.
- Add concurrency cancellation to stop older runs from wasting time.
- Make GitNexus execution repository-owned rather than ambient.
- Correct lint guidance in docs so developers do not rely on `npm run lint` to fix files.

## Risks / Trade-offs

- GitNexus wiring may differ between local and CI environments.
- Workflow splitting can duplicate setup if shared steps are not reused.
- Static checks may still take longer than ideal, but they should stay isolated from slower jobs.

## Migration Plan

1. Add or repair the repo-local fast verification command.
2. Update workflow structure and add concurrency cancellation.
3. Replace ambient GitNexus assumptions with a repository-owned path.
4. Fix `AGENTS.md` and `CLAUDE.md` lint guidance.
5. Run targeted verification commands locally.
