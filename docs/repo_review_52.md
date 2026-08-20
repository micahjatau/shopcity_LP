Worked for 4m 29s

Repo re-review — frontend-development

I re-reviewed the current branch at:

830000a2c84544bebca40eae16599a1b7f694d55 — fix(api): fail open when redis throttling is down.

There are 59 commits since the previous workflow-utilization baseline. The frontend has changed substantially: this is no longer mostly a shell with backend calls sprinkled into it. Most major workflows now have dedicated routes and real generated-client integration.

The problem has shifted from “backend exists but UI is missing” to “UI exists, but several workflows still use the backend incorrectly.”

Updated verdict

Dimension Current

Route/workspace coverage 88/100
Backend capability utilization 82/100
Cashier workflow completeness 73/100
Supervisor workflow completeness 76/100
Admin workflow completeness 84/100
Contract/RBAC correctness 66/100
Operational truthfulness 64/100
Test/governance evidence 60/100
Overall frontend product readiness 74/100
Decision NO-GO

This is a large improvement in breadth. I would not call the workflow-completion work finished yet because several remaining defects are capable of producing incorrect financial input, false operational health, authorization failures, or apparently working controls that do not actually complete their action.

---

P1 — Pilot health can report the wrong health state

This is currently the most concerning frontend/backend integration defect.

The backend contract exposes:

outbox.backlogCount
outbox.staleCount

sms.failedCount

offlineSync.failureCount

reports.staleCount

reconciliation.healthy
reconciliation.mismatchCount

But PilotHealthPanel reads several different properties:

summary.outbox?.hasBacklog
summary.outbox?.lastDispatchAt

summary.sms?.queuedCount

summary.offlineSync?.failedCount
summary.offlineSync?.pendingCount

summary.reports?.freshCount

The most serious mismatch is:

Backend: offlineSync.failureCount
Frontend: offlineSync.failedCount

So real offline failures can be returned correctly by the backend while the UI fails to recognize them.

The same problem exists with outbox state. The backend guarantees backlogCount, but the frontend determines warning status from:

summary.outbox?.hasBacklog

That field is not part of the published contract.

Even more serious: reconciliation can show green

ReportsWorkspace does:

tone={summary.reconciliation.unhealthy ? 'danger' : 'success'}

But the backend defines:

reconciliation: {
healthy: boolean,
mismatchCount: integer
}

not unhealthy.

Therefore this valid backend result:

{
"healthy": false,
"mismatchCount": 4
}

can still produce a success alert because unhealthy is undefined.

That violates the exact principle we have been reviewing for: the backend has the right information, but the UI is utilizing it incorrectly.

Required fix

Use the contract directly:

const reconciliationHealthy =
summary.reconciliation?.healthy === true;

const reconciliationTone =
reconciliationHealthy ? 'success' : 'danger';

Similarly:

const hasOutboxBacklog =
(summary.outbox?.backlogCount ?? 0) > 0;

const offlineFailures =
summary.offlineSync?.failureCount ?? 0;

I would make this a release-blocking frontend defect.

---

P1 — Redeem pre-fills the basket with the loyalty balance

The new Redeem workflow is much richer and now uses policy and balance context, but it contains a financial-data bug:

if (typeof lookupContext.availableBalanceKobo === 'number') {
setBasketAmount(lookupContext.availableBalanceKobo);
}

Those are completely different concepts.

Available loyalty balance = credit the customer owns

Basket amount = value of the current purchase

For example:

Customer balance: ₦12,500
Current basket: ₦40,000

The UI currently pre-populates:

Basket amount = ₦12,500

That then contaminates the calculated redemption ceiling because:

basketAmount * maxRedemptionBasketPercent

uses that incorrect value.

Correct behavior

Lookup should populate:

Customer
Card
Available balance
Expiring balance

but never the basket.

The cashier must enter or scan the current basket amount independently.

This is a P1 financial UX defect.

---

P1 — Cashiers are given controls the backend explicitly forbids

The new /cashier/customers page is substantial. It now supports customer search, customer detail, ledger history, cards and action flows.

However it exposes:

Assign card
Replace card
Change card status
Change customer status

to a user in the CASHIER workspace.

The backend explicitly says:

Operation Cashier Supervisor Admin

Card lookup Yes Yes Yes
Card assignment No Yes Yes
Card replacement No Yes Yes
Card status update No Yes Yes

Customer mutation has the same boundary:

Customer list/get CASHIER, SUPERVISOR, ADMIN
Customer create SUPERVISOR, ADMIN
Customer update SUPERVISOR, ADMIN
Customer status SUPERVISOR, ADMIN

So the frontend lets a cashier fill in consequential forms and only discovers at submission time that they are unauthorized.

That is not acceptable workflow design.

There is a second half to this problem

The AppShell gives supervisors:

/supervisor
/supervisor/transactions
/supervisor/approvals
/supervisor/fraud
/supervisor/reports

but no Customers or Cards workspace.

In other words:

Cashier
↓
gets management UI it cannot use

Supervisor
↓
is authorized by backend
but gets no customer/card management route

Correct architecture

Cashier should receive a read-only customer view:

Search
Customer detail
Card status
Balance
History
Use in Earn
Use in Redeem

Supervisor should receive:

Customers
Cards
Register customer
Edit customer
Block customer
Assign card
Replace card
Block/unblock card

Admin may reuse the same management components.

This is one of the biggest remaining workflow-architecture blockers.

---

P1 — Admin card replacement sends the wrong API payload

The Admin Cards page looks complete: lookup, assignment, replacement and status management now exist.

But replacement sends:

{
replacementSerialNumber: newSerialNumber.trim(),
reason,
} as any

The actual backend DTO is:

export class ReplaceCardDto {
serialNumber!: string;
}

Therefore the generated client is being bypassed with as any and the required field is not being supplied.

It should be:

{
serialNumber: newSerialNumber.trim()
}

This is exactly the kind of error generated clients are meant to prevent.

Rule I would introduce

For frontend calls to generated endpoints:

No `as any` on request DTOs for financial or state-changing operations.

If the generated type disagrees with the desired UI payload, either:

1. fix the UI payload, or

2. change the backend/OpenAPI contract and regenerate.

Don't suppress the type system.

---

P1 — Offline Sync exists, but Offline Capture still does not

The sync route is now one of the stronger pieces of the frontend.

It:

reads the local IndexedDB queue;

separates waiting/retry/approval/confirmed/rejected records;

submits offlineSyncControllerEarnBatchV1;

applies per-record results;

stores server transaction IDs and approval IDs;

supports retry;

preserves rejected/retryable records.

The underlying local store also exposes:

saveOfflineEarnRecord()
listOfflineEarnRecords()
updateOfflineEarnRecord()
deleteOfflineEarnRecord()

But EarnTransactionForm still doesn't use saveOfflineEarnRecord().

On network/API failure, it only does:

catch {
setStatus('error');
setMessage('Earn could not be submitted.');
}

So we currently have:

Offline record storage ✅
Offline queue UI ✅
Batch reconciliation ✅

Normal Earn → offline save ❌

The pipeline is missing its producer.

It is equivalent to building an inbox with no mechanism that can send mail into it.

Required flow

Submit Earn
↓
Did server provide definitive response?
├── yes → normal result
└── no
↓
Eligible for offline capture?
↓
Persist SAME logical operation
↓
Offline queue
↓
Batch sync later

Critically, the same idempotency key used for the attempted online request must enter the local record.

---

P1/P2 — Idempotency is stable only until the browser refreshes

This is improved from the previous implementation.

Both Earn and Redeem now use:

const idempotencyKeyRef = useRef(createDraftKey());

and:

const idempotencyKeyRef = useRef(createDraftKey());

That fixes repeated button submissions during one mounted component lifecycle.

But it does not meet the intended workflow requirement:

> “Persist logical drafts and reuse idempotency across refresh/retry.”

That task remains explicitly open in the current OpenSpec.

Scenario:

POST earn with key A
↓
server commits
↓
response lost
↓
browser refresh
↓
new React mount
↓
key B generated
↓
cashier retries

You have now lost the protection associated with key A.

For a financial workflow I would persist a draft object in IndexedDB/session storage containing at least:

draftId
idempotencyKey
payload
createdAt
submissionState

and only generate a new key when the logical draft is explicitly reset/completed.

---

P1 — Supervisor reports expose Admin-only functionality

ReportsWorkspace now has impressive breadth. It supports every major report, filters, materialization refresh, export and pilot summary.

But the same component is rendered directly in the Supervisor Reports page.

And also directly on the Supervisor home page.

The backend says:

Audit report ADMIN only
Pilot operations summary ADMIN only
Report refresh ADMIN only

while normal reports are Supervisor/Admin.

Yet a Supervisor currently gets UI options for all of those.

Again:

UI offers action
↓
backend rejects action

We should prevent that before the request.

ReportsWorkspace needs something like:

<ReportsWorkspace role="SUPERVISOR" />

or preferably:

<ReportsWorkspace
capabilities={{
    auditReport: false,
    pilotOperations: false,
    refreshMaterialization: false,
  }}
/>

The capability object can derive from the authenticated role centrally.

---

P1/P2 — “Export” does not actually export a file

The backend export endpoint returns text/csv.

The frontend invokes it, then merely sets:

> Export ready from backend contract.

There is no observed:

Blob
URL.createObjectURL()
download anchor
window navigation
file save

So pressing Export can successfully call the backend yet provide no CSV to the user.

That's another case of backend utilization technically existing but product functionality not being completed.

---

Other important findings

Severity Finding Status

P2 Cashier lookup says “card serial or receipt,” but only calls the card lookup endpoint Misleading
P2 Sync asks cashier to manually enter Device ID instead of deriving authenticated device context Fragile
P2 Redeem warns when requested amount exceeds calculated maximum but still allows Submit Backend protects it, UI should too
P2 Approval UI says reason is required but silently substitutes a generic reason when blank Audit-quality issue
P2 Fraud UI does the same generic-reason substitution Audit-quality issue
P2 Fraud still has no real status/severity/rule/branch/customer/date filters Partial
P2 Approval and fraud queues load only three records with no visible pagination Partial
P2 Branch UI ignores backend receiptWeekStartDay during create/update Under-utilized backend
P2 Adjustment UI takes raw customer ID and doesn't load current balance/customer context before a manual financial change Consequence preview incomplete
P2 AppShell maps a SYSTEM session to Admin navigation SYSTEM should not be treated as a human admin
P2 Pilot operations summary is fed into a generic summary.items renderer although its contract isn't a normal report collection Poor rendering
P3 Transaction reversal preview references generic amountKobo, which may not be the correct canonical amount for every transaction type Presentation defect

---

What has genuinely been closed

A lot has improved. I would now consider these areas functionally implemented rather than placeholders:

Workflow Status

Cashier card lookup Implemented
Public branch/policy context Implemented
Customer detail + recent ledger Implemented
Earn policy preview Implemented
Redeem balance/policy preview Implemented, correctness bug remains
Offline queue inspection Implemented
Offline batch reconciliation Implemented
Transaction detail Implemented
Reversal flow Implemented
Approval decision UI Implemented, refinement remains
Fraud decision UI Implemented, filtering remains
Report selection/filtering Implemented
Pilot summary API consumption Implemented, mapping bug remains
User creation/role/status Implemented
Human SYSTEM role removed from user picker Closed
Device create/update/attestation rotation Implemented
Branch create/update Implemented
Admin adjustment Implemented
Admin card management Implemented, replacement broken
No-op navigation buttons from the old shells Largely removed

This is a materially different frontend from the one I reviewed before.

---

Governance/testing status

The new OpenSpec tracker is currently still entirely unchecked, including role visibility, offline capture, persistent idempotency, workflow E2E coverage and validation.

There are existing frontend test suites for contract flows, critical flows, live-backend E2E, accessibility, offline queue and visual regression.

However, the 59-commit workflow delta did not show corresponding changes to the major contract/live E2E suites; primarily the visual snapshots changed. So I would not treat the new workflow implementation as regression-certified yet.

For the exact current SHA:

Vercel – shopcity-lp SUCCESS
Vercel – shopcity FAILURE
PR Actions runs none exposed

So the intended Vercel frontend is successfully deploying, but the repository's combined deployment status is mixed and the GitHub Actions quality gate is unverified, not failed.

---

Revised completion view

The key distinction now is:

UI exists? ~88%
Backend endpoint represented? ~82%
Correctly wired to backend? ~70%
Role-correct? ~66%
Safe enough for real operations? ~74%

Overall: 74/100 — NO-GO

I would not do another broad frontend redesign.

The remaining work is much more focused. The fastest route upward is:

Pilot-health contract mapping
↓
Redeem basket bug
↓
Cashier/Supervisor customer-card RBAC split
↓
Admin replacement DTO
↓
Earn → offline capture
↓
Persistent financial draft/idempotency
↓
Role-aware reports + real CSV download
↓
E2E tests / tracker reconciliation

Once those are corrected, I expect this frontend to move from the mid-70s into the high-80s/low-90s without another major architecture rewrite.
