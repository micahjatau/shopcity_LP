## 1. Production Entrypoints And CI Smoke

- [x] 1.1 Run `npm run build` and confirm the emitted API and worker artifact paths.
- [x] 1.2 Update `start:prod` and `start:worker:prod` to reference the verified emitted artifacts.
- [x] 1.3 Add post-build smoke checks that assert the API and worker artifacts exist.
- [x] 1.4 Add a non-long-running worker smoke command, such as a help or dry-run path, and include it in CI verification.
- [x] 1.5 Verify the production entrypoint checks fail when an expected artifact is missing.

## 2. Canonical Receipt Orchestration

- [x] 2.1 Search for all `ReceiptsService` imports and active consumers.
- [x] 2.2 Remove `ReceiptsService` if no active consumer requires it, including provider/export registration from `ReceiptsModule`.
- [x] 2.3 If a live consumer remains, replace `ReceiptsService` with a thin adapter that forwards to `LoyaltyService` and `ApprovalsService` only.
- [x] 2.4 Remove duplicate receipt transaction, idempotency, duplicate-receipt, review, and approval-policy logic from the receipts module.
- [x] 2.5 Add or update tests proving deprecated receipt capture delegates to the canonical earn path.

## 3. Earn Rate Limiting And 429 Contract

- [x] 3.1 Add an earn throttle key builder that includes tenant, authenticated staff user, and session device identity.
- [x] 3.2 Add explicit `@Throttle` metadata to `POST /api/v1/transactions/earn` using the TRD financial endpoint limit as the starting policy.
- [x] 3.3 Ensure idempotent retries remain safe under the new throttling behavior.
- [x] 3.4 Add opt-in `429 RATE_LIMITED` support to shared OpenAPI error-envelope helpers.
- [x] 3.5 Add tests for earn throttle key construction, 429 response behavior, and OpenAPI 429 documentation.

## 4. Cashier Data Minimization

- [x] 4.1 Define role-specific customer/card response DTOs for cashier sales workflow data.
- [x] 4.2 Update cashier customer list and retrieve responses to omit full phone, email, staff flag, registration attribution, block timestamps, and unnecessary internal identifiers.
- [x] 4.3 Update cashier card lookup responses to avoid spreading nested customer Prisma objects and expose only minimal customer summary plus card workflow state.
- [x] 4.4 Preserve supervisor/admin access to full customer contact details where operationally required.
- [x] 4.5 Add audit records for privileged full customer contact reads.
- [x] 4.6 Add regression tests for card create, replace, update, and lookup flows because `toPublicCard` has HIGH GitNexus blast radius.

## 5. API Error Contract Accuracy

- [x] 5.1 Remove earn endpoint `422` examples that the earn flow does not emit at runtime.
- [x] 5.2 Move approval-policy error examples to `POST /api/v1/approvals/{id}/decision`.
- [x] 5.3 Choose and document the stable error-code policy for inactive cards, blocked customers, and staff-ineligible customers.
- [x] 5.4 If masking is preserved, update issue/TRD-facing documentation to state those conditions intentionally map to `CARD_NOT_FOUND`.
- [x] 5.5 If distinct operational errors are selected, update service behavior, OpenAPI examples, tests, and privacy rationale together.
- [x] 5.6 Update OpenAPI integration tests so documented examples match actual endpoint behavior rather than only code presence.

## 6. Bounded List Endpoints

- [x] 6.1 Add shared cursor pagination parsing and response metadata for `limit`, `cursor`, `nextCursor`, and `hasMore` where appropriate.
- [x] 6.2 Update customer search to return bounded pages with stable timestamp-plus-ID ordering.
- [x] 6.3 Update customer ledger endpoints to return bounded pages with stable timestamp-plus-ID ordering.
- [x] 6.4 Update approval queue endpoints to return bounded pages with stable timestamp-plus-ID ordering.
- [x] 6.5 Update OpenAPI schemas and tests for paginated response shapes.

## 7. Release Evidence And Verification

- [x] 7.1 Run unit, integration, e2e, OpenAPI, lint/typecheck, architecture, and build gates required for Sprint 2 closeout.
- [x] 7.2 Push or manually dispatch visible GitHub CI for the target closeout commit.
- [x] 7.3 Record commit SHA, workflow run, static job, E2E job, integration job, OpenAPI generation result, and build confirmation.
- [x] 7.4 Update `docs/database/migration-tracker.md` with CI or remote verification evidence for the latest migrations.
- [x] 7.5 Close or unblock Issue #1 only after all required Sprint 2 exit-gate evidence is recorded.
- [x] 7.6 Run `openspec validate --change address-repo-review-20` and resolve any artifact or spec issues before implementation is marked complete.
