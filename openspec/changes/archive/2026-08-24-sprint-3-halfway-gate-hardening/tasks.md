## 1. Runtime Contract Truth

- [x] 1.1 Remove the false success contract from the reversal route and make the runtime/OpenAPI response explicit and unavailable.
- [x] 1.2 Update generated-client and OpenAPI verification so the reversal route no longer advertises a successful reversal response.

## 2. Financial Workflow Ordering

- [x] 2.1 Resolve completed idempotency records before mutable eligibility checks on retried financial requests.
- [x] 2.2 Add bounded retry handling for approved redemption serialization conflicts and cover the exhausted-conflict path.

## 3. Approval Expiry And Access Scope

- [x] 3.1 Move approval expiry into a scheduled bounded worker with row locking and expiry audit events.
- [x] 3.2 Enforce branch or actor scope for cashier transaction reads and add a denial test for out-of-scope access.

## 4. Release Evidence And Verification

- [x] 4.1 Reconcile the migration tracker and release evidence so deployable migration history, recovery evidence, and current-head CI evidence are recorded for the target commit.
- [x] 4.2 Run the targeted build, lint, OpenAPI, unit, integration, and evidence checks required to keep the halfway gate blocked until all evidence is present.
