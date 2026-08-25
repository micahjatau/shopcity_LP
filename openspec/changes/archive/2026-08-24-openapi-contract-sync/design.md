## Context

The CI failure in `docs/ci_review_2.md` shows the generated OpenAPI document and the committed `docs/api/openapi.json` have drifted. The current controllers and envelope helpers already define the intended contract, so the immediate problem is keeping the generated artifact synchronized and preventing the same drift from reappearing.

## Goals / Non-Goals

**Goals:**

- Keep the committed OpenAPI artifact identical to the generated document.
- Make drift fail in CI before release checks pass.
- Preserve the current API contract as documented by the controllers and tests.

**Non-Goals:**

- Change runtime API behavior.
- Redesign the OpenAPI generation pipeline.
- Add new external dependencies or contract formats.

## Decisions

- Treat `docs/api/openapi.json` as a generated artifact that must be regenerated from source, not hand-edited. Alternative: patch the JSON directly. Rejected because it is brittle and obscures the source of truth.
- Keep the CI cleanliness check based on a git diff against the committed artifact. Alternative: compare hash files or rely on manual review. Rejected because the git diff is already the repo’s established gate.
- Use the existing OpenAPI integration test as a contract regression signal alongside the generated artifact check. Alternative: add a separate schema snapshot system. Rejected because the existing test already exercises the current contract shape.

## Risks / Trade-offs

- [Generated output can change often] → Regenerate the artifact from the same source command used in CI and keep the check in the pipeline.
- [Large JSON diffs are noisy] → Limit the change to the generated artifact and verify the diff is only the expected contract update.
- [Contract changes may need code fixes] → If regeneration surfaces real schema mismatches, update the controller schema first, then re-export.

## Migration Plan

1. Regenerate `docs/api/openapi.json` from the current source tree.
2. Verify `git diff --exit-code -- docs/api/openapi.json` passes.
3. Run the OpenAPI integration test and the release gate check.
4. Commit the regenerated artifact.

## Open Questions

- None. The change is intentionally narrow: sync the generated artifact and keep the drift gate enforced.
