---
name: sprint-doc-sync
description: Use when a sprint, milestone, or foundation phase is complete and `AGENTS.md` and `README.md` need to be synced to the current repo state.
---

# Sprint Doc Sync

Use this skill only when closing a sprint or finishing a meaningful repository phase.

## Goal
- Keep `AGENTS.md` and `README.md` aligned with the executable source of truth after each sprint.

## Workflow
1. Read the highest-signal sources first: `package.json`, build/test/lint/config files, `docs/TRD.md`, `docs/database/migration-tracker.md`, and the current `AGENTS.md` and `README.md`.
2. Update `AGENTS.md` with only verified repo-specific guidance that would help a future agent avoid mistakes.
3. Update `README.md` so it reflects the current layout, commands, and foundation stack.
4. If the sprint changed schema or database workflow, update `docs/database/migration-tracker.md` as well.
5. Keep the changes compact. Remove stale guidance instead of layering new text on top of old assumptions.

## Rules
- Prefer executable sources of truth over prose.
- Do not add generic documentation filler.
- If commands, tooling, or folder structure changed, document the exact current behavior.
- Preserve the repository's existing architecture decisions and terminology from `docs/TRD.md`.

## Output
- Make the docs edits directly.
- Summarize what changed and note any follow-up that needs a restart or a config reload if applicable.
