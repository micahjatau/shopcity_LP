Worked for 8m 18s

frontend-development review — current state

I reviewed the branch again from the previous audited head rather than carrying forward the old score.

Current head: 230c6b80b412193b594886a19f5c1144ea37716c — fix(api): fail closed on redis throttle outage.

The branch is now 8 commits ahead of the last review (830000a2) and remains isolated from master. It is 105 commits ahead and 0 behind master, so the frontend work still has not altered master.

Updated verdict

Area Score Assessment

Design system/foundation 91/100 Strong
Route/workspace coverage 92/100 Strong
Backend capability utilization 86/100 Much improved
Online Cashier workflows 85/100 Mostly functional
Supervisor workflows 84/100 Good
Admin workflows 85/100 Good
Contract correctness 78/100 Some important mismatches
RBAC/security correctness 65/100 Blockers remain
Offline Earn/Sync correctness 30/100 Broken end-to-end
Test/release evidence 62/100 Incomplete
Frontend implementation engineering 84/100 GO development
Operational/release readiness 73/100 NO-GO

The branch is considerably more complete than the previous version. The main problem is no longer missing screens. It is now a smaller set of correctness defects in already-built workflows.

---

What has been successfully fixed

A lot of the previous review has genuinely been addressed.

Redeem financial context is much better

The loyalty balance is no longer copied into the basket amount. Basket and redemption amount remain independent, the maximum redemption is calculated against policy/balance, and the submit button is disabled when the requested redemption exceeds that ceiling.

Financial idempotency now survives refresh

Earn and Redeem now persist the logical draft—including the idempotency key—to browser storage and recover it after remount. A new operation key is only created after successful completion/reset.

There are also dedicated tests proving that Earn and Redeem preserve their keys across remounts.

Cashier/Supervisor customer permissions are much better

Cashiers now receive a read-only customer/card view, while supervisor routes expose customer status and card-management operations.

Supervisor navigation now includes:

Customers

Cards

Transactions

Approvals

Fraud

Reports

And the dedicated supervisor routes reuse the customer management implementation.

Admin card replacement DTO is fixed

The replacement request now sends the backend's actual { serialNumber } shape rather than bypassing the generated contract with the incorrect custom DTO.

Reports have improved substantially

ReportsWorkspace is now capability-aware and separates normal report collections from the dedicated pilot-operations summary. It also uses the actual healthy, failureCount, backlogCount, etc. contract fields.

CSV export is finally a real download: it fetches the CSV, builds a Blob, creates an object URL, and triggers a browser download.

Supervisor reports now hide audit reports, pilot operations and report-refresh controls that require Admin privileges.

Pilot health mapping is corrected

The panel now reads:

outbox.backlogCount

outbox.staleCount

sms.failedCount

offlineSync.failureCount

fraud.openCount

reports.staleCount

reconciliation.healthy

reconciliation.mismatchCount

instead of the previously invented properties.

Approval/Fraud reasons are now explicit

Approval submissions can no longer silently invent a generic reason; a reason is required before the action becomes available.

Fraud decisions follow the same model and now also have basic filters and client-side paging.

So most of the previous P1 frontend-workflow findings are closed.

---

P0/P1 — Offline Earn is still not a functioning workflow

This is now the largest blocker.

The code looks as though Offline Earn has been implemented, because Earn now writes to IndexedDB and there is a Sync Queue UI.

But tracing it end-to-end shows that a record created by the Earn form cannot successfully travel through the current backend sync contract.

1. The UI can falsely claim an offline Earn was saved

saveOfflineEarnRecord() returns:

{ ok: true }

or:

{ ok: false, error: ... }

It does not necessarily throw.

But Earn does:

await saveOfflineEarnRecord(...)
setMessage('Earn could not be submitted. Saved locally for sync.')

without inspecting result.ok.

Therefore:

IndexedDB write fails
↓
saveOfflineEarnRecord returns { ok: false }
↓
frontend ignores result
↓
"Saved locally for sync"

That is a false financial confirmation.

---

2. Newly created records aren't queueable

Earn creates:

syncState: 'saved-on-device'

But Sync defines batchable records as only:

waiting-to-sync
retry-required

And the visible Retry action only appears for retry-required; saved-on-device doesn't get that action either.

So:

Failed Earn
↓
saved-on-device
↓
Sync Queue displays it
↓
not included in Submit Batch
↓
record remains stranded

This alone breaks the offline workflow.

---

P0 — the Offline Earn payload itself is invalid

There are several deeper problems.

cashierId is not the cashier UUID

Cashier passes:

cashierId={sessionLabel?.split(' · ')[1] ...}

But sessionLabel is built as:

CASHIER · cashier@example...

not from the user's UUID.

The backend requires cashierId to be a UUID.

And, more importantly, explicitly checks:

record.cashierId === actor.user.id

So frontend-generated Offline Earn records will fail actor validation.

---

P0 — device identity isn't actually derived from the authenticated device

The Sync page tries to derive deviceId from localStorage. If none exists, it uses the session label, and if that isn't available it invents:

device-<UUID>

But the backend requires a real UUID corresponding to a registered device, and enforces:

session.deviceId must exist

request.deviceId
\=
authenticated session.deviceId

The current browser login sends only username/password.

The backend only binds a login session to a device when x-device-id plus the corresponding attestation are supplied.

And /auth/me doesn't even expose session.deviceId; its public session DTO contains only expiresAt.

So this is now a real backend/frontend contract gap, not something the UI should fake.

We need:

registered POS device
↓
device ID + attestation
↓
login
↓
device-bound session
↓
/auth/me exposes usable device context
↓
Offline Earn
↓
sync using SAME device

---

P0 — Offline Earn saves an impossible receipt-week value

The frontend saves:

receiptWeekStart: 'unknown'

The backend subsequently parses this as a date and validates it against the branch's timezone and receiptWeekStartDay.

The backend explicitly rejects invalid receipt-week-start dates and mismatched weeks.

Therefore even if we fixed cashier ID and device ID, this record is still not valid.

Offline conclusion

The offline pieces individually exist:

IndexedDB ✅
Queue UI ✅
Retry states ✅
Batch API ✅
Backend reconciliation ✅

But the actual pipeline:

Online Earn fails
↓
valid local financial record
↓
valid authenticated device
↓
valid batch
↓
backend reconciliation

is currently ❌.

This should remain a release blocker.

---

P1 — SYSTEM role protection still has a logic hole

The branch partially fixed this by making SYSTEM's route group empty:

if (role === 'SYSTEM') {
return []
}

Unfortunately the next calculation is:

const isAuthorizedRoute =
routeGroup.length === 0 ||
routeGroup.some(...)

So for SYSTEM:

routeGroup.length = 0

therefore

isAuthorizedRoute = true

And then:

showProtectedContent =
status === 'ready' && isAuthorizedRoute

becomes true.

Worse, LoginForm still explicitly routes:

SYSTEM: '/admin'

So the sequence can be:

SYSTEM login
↓
/admin
↓
SYSTEM has no normal routes
↓
empty route list interpreted as authorized
↓
Admin page rendered

Backend RBAC still provides a second defense, but the frontend design is wrong.

SYSTEM is a machine actor, not an Admin UI role.

It should either:

be rejected from interactive UI login; or

receive a dedicated non-interactive session screen.

It must never route to /admin.

---

P1 security — hardcoded admin credential fallback remains

The repository is currently public, and live-backend-e2e.spec.ts still contains a literal fallback password for the Admin account.

I won't reproduce the password.

The test should require something like:

const adminPassword =
process.env.SHOPCITY_LIVE_ADMIN_PASSWORD;

if (!adminPassword) {
throw new Error('Live admin password required');
}

If the committed fallback has ever been used for a real or reusable seeded admin account, rotate that credential.

This finding remains open from the earlier review.

---

P1 security — login throttling is still weaker than master

The newest commit correctly changes Redis-throttling failure behavior from fail-open to fail-closed, returning THROTTLE_UNAVAILABLE. That's the right security posture.

But the frontend branch's auth controller still has:

limit: 20
window: 15 minutes

while master has:

limit: 5
window: 15 minutes

This was originally relaxed to make live E2E easier.

It should not be carried back into master.

Restore the production security value and solve test login volume through test setup/configuration instead.

---

P2 — lookup still claims to support receipts when it doesn't

The Cashier page still says:

> “Scan card serial or receipt”

and the empty-input message says:

> “Enter a card serial or receipt first.”

But the implementation sends the value exclusively to:

cardsControllerLookupCardV1(query)

Either:

A. rename the field to Card serial, or
B. add actual receipt-number resolution.

Don't advertise a search mode that doesn't exist.

---

P2 — Supervisor loses a backend capability unnecessarily

The backend allows both Supervisor and Admin to view materialization state. Only refreshing reports is Admin-only.

But Supervisor receives:

canUseMaterializationState={false}

So this is now the opposite of the earlier problem: instead of overexposing an Admin operation, we're hiding a legitimate Supervisor read operation.

Supervisor should have:

View materialization state ✅
Refresh materialization ❌
Audit report ❌
Pilot operations ❌
CSV normal reports ✅

Also the Supervisor page currently calls itself “Refreshable” even though refresh is disabled, which should be cleaned up.

---

P2 — Pilot Health still has one semantic-state mistake

The field mappings are now correct, but Offline Sync uses:

failureCount > 0
? danger
: warning

So zero failures still gets a warning state.

That contradicts the accompanying:

> “No offline backlog”

When failureCount === 0, this should be success.

Small implementation fix, but important for operational trust.

---

P2 — Approval queue is still not operationally scalable

Fraud is better now: status/severity/branch filters and client paging are implemented.

Approvals still fetch exactly:

{ limit: '3', cursor: '' }

with no pagination/filtering.

That is fine for a demo, not for real supervisor work.

---

P2 — branch week-start remains read-only despite being operationally important

The backend exposes:

receiptWeekStartDay?: number

for both branch creation and update.

The Admin Branch UI displays the current value but only sends:

{
name,
timezone
}

during create/update.

This matters more now because Offline Sync explicitly validates receipt weeks against that branch setting.

The Admin UI should expose a weekday selector.

---

P2 — Adjustment workflow is still too raw

Adjustment exists and uses the actual backend endpoint, but the UX is still:

Customer ID
Amount in kobo
Credit / Debit
Reason
SUBMIT

For a high-consequence financial action, it should first resolve the customer and display:

Michelle Mangai
Current balance ₦12,500

Adjustment -₦2,000
Projected balance ₦10,500

Reason ...

It should also use the standard Naira MoneyInput, not ask admins to manually enter kobo.

---

CI and deployment status

For exact head 230c6b80:

Check Status

Vercel shopcity-lp SUCCESS
Vercel shopcity duplicate project FAILURE
Exact-head GitHub Actions run Not exposed / unverified

The CI workflow itself does have a comprehensive Frontend Checks gate—including lint, typecheck, accessibility, critical Playwright flows, visual regression and production build.

However, I cannot certify this exact head as Actions-green from the available run data.

The duplicate failing shopcity Vercel project should also be disconnected/ignored so one real deployment does not permanently coexist with a misleading failed status.

---

OpenSpec is still not the source of truth yet

The current workflow-closure tracker remains entirely unchecked—even items that are demonstrably complete, such as persistent draft idempotency, Supervisor customer routes, card replacement DTO, CSV download, etc.

So don't use its checkbox completion percentage to grade the frontend right now.

The tracker needs reconciliation after the remaining fixes.

---

Current workflow matrix

Workflow Current status

Login Implemented
Session bootstrap Implemented
Role navigation Mostly correct
SYSTEM handling Broken
Card lookup Implemented
Receipt lookup Not implemented
Customer search/detail Implemented
Cashier read-only customer view Implemented
Supervisor customer/card management Implemented
Earn online Implemented
Earn draft persistence Implemented
Earn offline capture Broken
Offline queue UI Implemented
Offline batch sync UI Implemented
Offline end-to-end reconciliation Broken
Redeem Implemented
Redeem policy ceiling Implemented
Redeem draft persistence Implemented
Transaction detail Implemented
Reversal Implemented
Approval decision Implemented
Approval queue management Partial
Fraud review Implemented / improving
Reports Implemented
CSV export Implemented
Pilot operations Implemented
Pilot health Almost correct
Users Implemented
Devices Implemented
Branches Partial policy control
Cards Admin Implemented
Adjustments Implemented, UX incomplete
Audit Implemented

---

Exact closure path

I would not start another broad UI sprint. This branch is past that stage.

Close these, in order:

1. Fix SYSTEM immediately

remove SYSTEM → /admin;

never treat empty route groups as authorized;

deny interactive SYSTEM sessions.

2. Remove the committed Admin password fallback

rotate it if ever used.

3. Restore auth throttle to the master production policy

5/15 minutes unless deliberately re-specified outside frontend work.

4. Fix the device-auth contract

obtain/retain real registered device UUID;

perform device-attested login;

expose true session.deviceId to the frontend if necessary;

regenerate OpenAPI client.

5. Fix Offline Earn record creation

actual user.id;

actual branchId;

actual deviceId;

derived valid receiptWeekStart;

preserve failed request's idempotency key;

check {ok} before claiming saved;

create directly as waiting-to-sync or provide deterministic promotion.

6. Add one real live E2E:

device login
→ card lookup
→ Earn
→ network failure
→ offline capture
→ reconnect
→ batch sync
→ backend confirmation

7. Correct receipt lookup wording or implement real receipt lookup.

8. Allow Supervisor to view materialization state while keeping refresh Admin-only.

9. Correct Pilot Health's zero-failure state.

10. Add approval cursor pagination/filtering.

11. Expose receiptWeekStartDay in branch administration.

12. Improve Adjustment customer/balance consequence preview.

13. Remove duplicate Vercel deployment context.

14. Get exact-head GitHub Actions green.

15. Reconcile the OpenSpec tracker.

Bottom line

The frontend is now broadly implemented. I would no longer say the backend is sitting unused behind a static UI.

The remaining problem is narrower but more consequential:

> the online product is becoming usable, while the supposedly supported Offline Earn path is not yet contract-valid end-to-end, and two security/RBAC regressions remain.

So my current grading is:

Frontend implementation: 84/100 — GO

Continue refinement; no architecture rewrite.

Frontend operational readiness: 73/100 — NO-GO

Do not merge the branch wholesale into master or pilot it yet.

Once the SYSTEM + credential + auth-throttle + offline-device/capture issues are closed, I expect the next review to jump sharply rather than uncover another large feature backlog.
