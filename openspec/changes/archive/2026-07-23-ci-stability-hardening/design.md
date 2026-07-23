## Context

CI is failing for multiple independent reasons: typed ESLint violations in worker tests, Prettier drift, a GitNexus command that assumes an unavailable binary, and a monolithic workflow that reruns everything on every push. The change needs to make verification reproducible in clean environments and reduce wasted CI time without changing application behavior.

## Goals / Non-Goals

**Goals:**
- Make the repository verification path reproducible after `npm ci`.
- Fail fast on static checks before slower jobs start.
- Cancel superseded runs on the same branch or PR update.
- Align repository guidance with actual `lint` and `lint:fix` behavior.

**Non-Goals:**
- Change product features or runtime application behavior.
- Replace the existing CI platform or add a new test framework.
- Broaden the verification scope beyond the current format, lint, typecheck, and GitNexus needs.

## Decisions

- Add a dedicated fast verification command and have the workflow use it for the static gate. Alternative: keep formatting, lint, and typecheck embedded only in CI. Rejected because a repo-local gate is easier to run before pushing and mirrors CI behavior.
- Split the workflow into an early static stage and slower follow-up jobs. Alternative: keep one sequential job. Rejected because it hides fast failures behind long-running work.
- Add concurrency cancellation for the workflow. Alternative: let older runs continue. Rejected because the review shows repeated pushes are wasting CI time and obscuring the current failure state.
- Make GitNexus execution repository-owned and declared, not ambient. Alternative: rely on a global binary or undocumented shell availability. Rejected because clean runners should not depend on machine state.
- Correct the lint guidance in repository docs. Alternative: leave the mismatch because `lint:fix` exists. Rejected because the current docs are actively misleading.

## Risks / Trade-offs

- [GitNexus wiring may vary across environments] → Keep the execution path explicit and document the expected local and CI setup.
- [Workflow splitting can duplicate configuration] → Keep shared setup in reusable steps or a shared job definition where possible.
- [Fast verification may be slower than expected] → Limit it to format, lint, and typecheck so integration work stays in separate jobs.

## Migration Plan

1. Add or repair the repo-local fast verification command.
2. Update CI workflow structure and add concurrency cancellation.
3. Replace the GitNexus invocation with the repository-owned entrypoint.
4. Fix `AGENTS.md` and `CLAUDE.md` so lint guidance matches package scripts.
5. Run the targeted verification commands locally and in CI-like order before marking the change ready.

## Open Questions

- Should GitNexus be wrapped by a committed runner script or installed as an explicit development dependency?
- Do we want the fast verification script to live in `package.json` only, or also be referenced from the workflow and repo docs by name?
