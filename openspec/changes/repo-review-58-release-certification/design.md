# Design: Repo review 58 release certification closure

## Context

The previous hardening change closed most product and security blockers. Review 58 identifies the remaining release boundary: the cashier overview claims scan readiness without an input, its activity panel is not a transaction list, and formal certification lacks exact-head operational proof. The implementation must preserve backend authority, append-only financial history, branch/tenant isolation, session/device enforcement, and existing deep links.

## Goals

1. Make `/cashier` satisfy the TRD scan/search-first acceptance criterion.
2. Provide a small, authoritative, same-day transaction summary.
3. Produce reproducible authenticated business-path performance evidence.
4. Make candidate, CI, deployment, security, branch, topology, migration, device, and final-diff evidence independently verifiable.
5. Close the release gate without weakening existing runtime security or financial invariants.

## Non-goals

- Rebuild the loyalty ledger or change financial calculation semantics.
- Move authorization, balances, approval decisions, or eligibility into the browser.
- Replace the existing route architecture with a monolithic cashier page.
- Delete or rename the duplicate Vercel project before ownership is established.
- Treat operational probes as substitutes for authenticated workflow benchmarks.

## Decisions

### 1. Dashboard scanner is a first-class input

Add one auto-focusable, keyboard-wedge-compatible input to the cashier overview. It accepts a card serial or manual card number, submits through the existing lookup API, clears safely after a successful selection, and exposes a visible fallback action to the dedicated lookup route. On success, the overview renders only the existing role-safe projection and links to dedicated Earn/Redeem routes with a verified card identifier/context.

The input must not accept or display frontend-provided balance, role, eligibility, or card status as authoritative. Scanner input is untrusted input and remains subject to normal validation, throttling, session, CSRF, and branch scope.

### 2. Today activity is a bounded, operation-specific read model

Use the existing scoped activity endpoint and revise its additive DTO to return no more than 10 records for the authenticated tenant, branch, cashier, and business-day boundary. The backend computes the business day using configured ShopCity timezone and returns sanitized operation, timestamp, receipt/reference, outcome, and operation-specific integer-kobo fields:

- Earn: `loyaltyAmountKobo` only when an authoritative ledger or authoritative pending-credit projection exists; `purchaseAmountKobo` MAY be supplied as contextual receipt data but MUST NOT be used or labelled as earned credit.
- Redeem: `loyaltyAmountKobo` represents the requested or confirmed redeemed loyalty amount according to outcome.
- An Earn lacking an authoritative loyalty amount carries an explicit pending-calculation representation rather than a fabricated zero or receipt purchase amount.

The frontend renders Earn with a positive direction and Redeem with a negative direction, does not calculate totals or infer success from local state, and obtains the typed DTO through the generated OpenAPI client rather than handwritten response parsing.

### 3. Benchmark paths use real authenticated workflows

The benchmark harness will create or load a controlled authenticated cashier, supervisor, and provisioned device state. It will exercise:

- Lookup from the client-facing cashier route through the frontend proxy.
- Earn confirmed with an isolated receipt and valid positive amount.
- Earn pending approval using a fixture that deterministically requires approval.
- Redeem confirmed with an isolated balance/card fixture.
- Supervisor dashboard/report navigation and data rendering.

Each run records navigation start/end, relevant API timings where useful, status/outcome, sample number, and environment metadata. Test data is isolated by candidate run and cannot mutate uncontrolled production customer balances.

The release record reports P50/P90 and compares them to: lookup <2s, Earn <3s, Redeem <3s, dashboard <5s. Pending Earn is reported separately and must have an explicit expected outcome/threshold agreed in the evidence schema rather than being silently excluded.

### 4. Evidence is immutable and exact-head bound

The evidence schema requires candidate SHA, workflow run/head SHA, deployment artifact SHA, environment, Vercel project/deployment identifiers, topology, benchmark artifact hashes, security workflow conclusions, protected-branch settings, migration/restore artifact references, and verifier version. A verifier rejects mismatched or missing hashes and cannot certify a different deployed commit.

### 5. Security and branch settings are verified externally

The security workflow must run against the exact candidate through a protected-master PR or explicit workflow dispatch. The final evidence records Gitleaks, CodeQL, Trivy, and ZAP conclusions. GitHub branch protection is queried directly to prove that `ci` is a real successful required context. A successful ordinary branch CI run alone is insufficient.

### 6. Topology and duplicate-project handling are documented, not guessed

Record frontend, backend, and database regions and deployment URLs. Compare active Vercel projects and deployments, document whether `shopcity` is intentional or legacy, and identify an owner/action. Project deletion remains outside this change unless separately approved.

### 7. Pilot and restore evidence precede certification

Provision or migrate pilot devices using the existing administrative flow, verify branch binding and attestation without storing raw secrets in evidence, and test revoke/rotate/session invalidation behavior. For any schema or migration impact, perform the repository-required backup/restore verification, update the migration tracker, and preserve the exact command output/evidence reference.

### 8. Final review is a release gate

Run `detect_changes()` after implementation, inspect the full diff and working-tree status, verify every proposal task and acceptance criterion, and document residual risks. Do not mark the change complete while any required evidence is absent.

## Compatibility and migration

- Keep existing `/cashier/lookup`, `/cashier/earn`, `/cashier/redeem`, and `/cashier/sync` URLs valid.
- Add read-only activity data without changing financial mutation contracts.
- Use additive API/schema changes and regenerate OpenAPI/client artifacts where applicable.
- Do not edit applied migrations; use expand-and-contract follow-ups.
- Preserve unrelated existing working-tree changes.

## Risks and mitigations

| Risk                                             | Mitigation                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Scanner input creates duplicate lookup requests  | Debounce/submit guard, request cancellation, existing throttling, and browser tests.                            |
| Activity summary leaks cross-branch data         | Backend session scope, tenant/branch/cashier integration tests, and bounded DTO projection.                     |
| Pending Earn displays receipt value as credit    | Operation-specific DTO fields, no Earn fallback to purchase amount, explicit pending-calculation UI, and tests. |
| Earn/Redeem amounts are operationally ambiguous  | Positive/negative semantic rendering and accessibility/visual regression coverage.                              |
| Handwritten activity parsing drifts from OpenAPI | Regenerate the client and consume its typed reporting method in the overview component.                         |
| Benchmark mutates real balances or receipts      | Dedicated fixtures, unique run identifiers, controlled accounts, cleanup/reconciliation, and explicit approval. |
| P50/P90 hides tail failures                      | Retain raw samples and report sample size plus P95 where available.                                             |
| Security workflow checks a different SHA         | Evidence verifier compares candidate, workflow head, and deployment artifact hashes.                            |
| Branch protection has stale `ci` context         | Direct GitHub settings inspection and merge-gate verification.                                                  |
| Pilot device migration strands devices           | Staged migration, explicit inventory, rollback/revocation plan, and device-level smoke test.                    |
| Restore drill is only documentary                | Execute an actual restore validation and retain output/artifact hashes.                                         |
| Current branch remains too large to merge safely | Freeze candidate, run full gates, open protected-master PR, and avoid new broad features.                       |

## Acceptance criteria

- `/cashier` contains a usable focused scanner/card-number input and successful lookup exposes verified customer context without unnecessary navigation.
- `/cashier` displays a bounded backend-backed same-day transaction list with loading, empty, error, and unauthorized states.
- A pending Earn never displays receipt purchase amount as loyalty credit; Earn/Redeem directions are unambiguous; the generated reporting client is the sole frontend activity-contract consumer.
- Authenticated browser tests cover scanner lookup, action navigation, and activity rendering.
- Exact candidate/deployment/CI/security/branch/topology evidence validates successfully.
- Required authenticated benchmark paths have raw artifacts, P50/P90 results, and threshold outcomes.
- Pilot device provisioning and backup/restore evidence are complete and recorded.
- GitNexus final diff analysis and repository verification are complete.
- Formal release certification remains blocked if any required artifact or check is missing.
