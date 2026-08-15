Worked for 6m 7s

Workflow utilization audit — frontend-development

I went through it again specifically from the angle you raised:

> Does the backend capability actually have a usable UI workflow, or does it merely exist in code?

The answer is that the frontend is still substantially under-utilizing the backend.

Current frontend head: 16b3e034f7e67b8799e935fecaa1af1ed5f81683
The shopcity-lp Vercel deployment for this exact SHA is now READY, so the earlier stale static deployment problem is fixed. However, the current source shows that a significant number of the visible “workflow” areas are still cards, labels, demo metrics, or buttons without actual business behavior.

Revised assessment

Area Assessment

Design-system implementation 91/100
Frontend infrastructure 82/100
Auth/session foundation 80/100
Backend contract utilization 47/100
Actual workflow UI completeness 44/100
Operational/deployed usability ~55/100
Decision NO-GO to call workflows implemented

The next phase should not be another visual-design pass. It should be a backend-utilization / workflow-completion sprint.

---

1. Cashier workflow

This is the most important area.

Your design specification requires:

Home
Earn
Redeem
Customers
Sync

and explicitly defines customer/card identification, balances, policy context, offline queueing and persistent transaction results.

The actual cashier page presently has one screen containing cards labelled:

Lookup

Earn

Redeem

Customers

Sync

but only Earn and Redeem have operational forms.

Current utilization

Capability Backend UI Status

Card lookup Available Input only, no lookup handler MISSING
Customer search Available No search implementation MISSING
Customer detail Available No customer detail MISSING
Earn Available Calls API PARTIAL
Redeem Available Calls API PARTIAL
Customer balance Backend data available Not presented MISSING
Transaction history Backend ledger exists No UI MISSING
Offline capture Backend + IndexedDB foundation Not connected to Earn PARTIAL
Offline synchronization Available No sync action MISSING
Shift activity Backend/report data can support it Hard-coded demo numbers FAKE/STATIC

This is particularly problematic because card lookup is already built

The backend has:

GET /api/v1/cards/lookup/:serialNumber

for Cashier, Supervisor and Admin.

Yet the cashier UI renders:

<Input
  placeholder="Scan card serial or receipt"
  aria-label="Lookup"
/>

with no value state, submit handler or API call.

So card lookup is currently backend functionality that is effectively inaccessible to an actual cashier.

P0: implement the lookup workflow

It should become:

Scan/type card
↓
GET card lookup
↓
Customer identity
Card status
Available balance
Expiring credit
↓
[Earn] [Redeem] [View customer]

This should also populate Earn/Redeem instead of making the cashier manually re-enter the card serial.

---

2. Customer workflow is essentially missing

This is one of the largest backend/UI gaps.

The backend already supports:

GET /customers
POST /customers
GET /customers/:id
PATCH /customers/:id
PATCH /customers/:id/status

with role boundaries already enforced. Cashiers can search/view; supervisors/admins can register/edit/change status.

The design system specifies exactly that behavior.

Actual frontend

There is no:

CustomerSearch

CustomerList

CustomerDetail

CustomerRegistrationForm

CustomerEditForm

customer-status control

customer balance view

customer transaction history view

The cashier screen merely says:

> “Customers — Check identity, cards and loyalty balance.”

That is description, not functionality.

Priority

P0.

Customer management is not an optional admin convenience. It sits directly in the Earn/Redeem workflow.

---

3. Card management is missing

Backend capability is already mature:

GET /cards/lookup/:serialNumber
POST /cards
POST /cards/:id/replace
PATCH /cards/:id/status

The design specification already calls for:

scan-friendly lookup;

card assignment;

replacement;

blocking/unblocking;

guided consequential replacement flow.

None of those management workflows currently exists in the frontend.

Needed screens

Cashier

Card lookup
→ customer + balance + status

Supervisor/Admin

Customer
↓
Active card
├── Assign
├── Replace
└── Change status

Replacement particularly needs the deliberate confirmation flow already defined in the design system.

P0/P1.

---

4. Earn exists, but barely uses the backend response

The Earn form genuinely calls the generated client:

loyaltyControllerEarnV1(...)

so this is not a placeholder.

But the backend's response is rich. It provides data including:

transaction ID;

customer;

card;

receipt;

purchase amount;

credit earned;

available balance;

expiry;

SMS status;

approval status/context;

ledger information.

The UI discards virtually all of that.

It only asks:

if (response.status === 201) {
setMessage('Earn confirmed by backend contract.')
}

if (response.status === 202) {
setMessage('Earn awaiting approval.')
}

What the UI should show after Earn

The design system already requires:

✓ Credit added

Customer Michelle Mangai
Receipt SC-18291
Purchase ₦25,000
Credit earned ₦1,250
New balance ₦8,720
Expires 15 Aug 2027
SMS Queued
Transaction #...

with:

[New transaction] [View customer]

Earn also needs before-submit context

Instead of this:

Card serial
Receipt
Purchase
Submit

it should be:

Card lookup
↓
Michelle Mangai
Active card
Balance: ₦7,470

Receipt
Purchase ₦25,000

Expected credit
₦1,250

[Review transaction]

Then confirm and submit.

---

5. Earn still doesn't use stable transaction idempotency

This previous issue remains.

Every submission currently does:

idempotencyKey: crypto.randomUUID()

inside handleSubmit().

So a retry after an uncertain network outcome gets another key.

The design specification explicitly requires preserving the logical transaction/idempotency context.

That has to be corrected as part of the Earn UI workflow—not treated as backend infrastructure.

---

6. Redeem is similarly under-utilized

Redeem does call the real generated API client.

But the designed workflow requires:

Identify customer/card
↓
Show active balance
↓
Basket amount
↓
Requested redemption
↓
Show policy/cap
↓
Explicit review
↓
Submit

Current UI is effectively:

Card serial
Receipt
Basket amount
Requested amount
Date
[Submit redemption]

It does not show:

customer;

card status;

available balance;

minimum redemption;

maximum basket percentage;

calculated maximum redemption;

resulting balance;

confirmation summary;

FIFO context where useful;

transaction details after success.

And it also generates a new idempotency key every submission.

So Redeem is API-wired but UX-incomplete.

---

7. Public configuration endpoint is being wasted

This is an especially good example of what you were concerned about.

Backend already provides a frontend-safe configuration endpoint with:

Tenant

ID

name

Branch

ID

name

timezone

receipt week start

Policies

earn rate;

minimum redemption;

maximum basket percentage;

purchase fraud threshold;

purchase approval threshold;

redemption approval threshold;

offline-redemption policy.

The UI currently does not use this to drive the workflows.

That means the frontend is asking for numbers while the backend already knows what rules should contextualize those numbers.

It should power

Earn

Purchase: ₦100,000
Earn rate: 5%
Expected credit: ₦5,000

Approval required above ₦...

Redeem

Available: ₦15,000
Basket: ₦10,000
Maximum allowed: ₦5,000
Minimum redemption: ₦...

General shell

ShopCity
Wuse II Branch
Africa/Lagos

Offline

Whether redemption is available offline.

P1.

---

8. Offline sync is not actually implemented as a workflow

The backend already exposes:

POST /api/v1/offline-sync/earn-batch

and returns a per-record result:

CONFIRMED
PENDING_APPROVAL
REJECTED
RETRYABLE

along with transaction/approval/error/retryability information.

The frontend does have IndexedDB queue infrastructure.

But its visible SyncQueueIndicator only counts local records. Its link goes straight back to /cashier.

And the Cashier button:

> Open sync queue

has no action attached.

So we currently have:

IndexedDB queue ✅
Backend batch sync ✅

Actual queue screen ❌
Batch submission UI ❌
Per-record reconciliation ❌
Retry handling ❌
Reject reason display ❌

This is a major unused backend capability.

P0/P1.

---

9. Supervisor transactions are a text placeholder

The design system specifies:

Overview
Transactions
Customers
Cards
Approvals
Fraud
Reports

for supervisor.

But the current “Transactions” tab contains only:

> “Search, inspect and trace recent branch activity.”

No data. No search. No transaction detail.

This becomes even more significant because the backend transaction model already has rich information about:

Earn;

Redeem;

Adjustment;

Reversal;

Expiry;

allocations;

restorations;

SMS state;

financial direction;

available balance.

We need a real transaction workspace.

---

10. Reversal has zero frontend UI

The backend has an explicit production-grade endpoint:

POST /api/v1/transactions/:transactionId/reverse

with:

supervisor/admin RBAC;

idempotency;

reason;

immutable compensating transaction;

already-reversed handling;

manual-review handling.

There is no frontend workflow invoking it.

That means one of the important support/dispute functions is backend-only.

Required flow

Transaction detail
↓
[Reverse transaction]
↓
Original transaction
Customer
Amount
Current balance/consequence
↓
Reason *
↓
Confirm reversal
↓
Result + new balance

P1.

---

11. Manual adjustment has zero frontend UI

Backend has:

POST /api/v1/adjustments

for Admin, with idempotency and immutable financial evidence.

No UI exposes it.

The design system already classifies adjustments and reversals as level-3 financial actions requiring full context and confirmation.

Required Admin workflow:

Customer
Current balance

Adjustment type
○ Credit
○ Debit

Amount
Reason
Effective date

Review consequence
↓
[Confirm adjustment]

P1.

---

12. Approvals are only partially implemented

This is one of the better utilized backend areas.

Current Supervisor UI:

loads approval records;

selects a record;

supports Approve / Reject;

calls the generated approval decision endpoint.

So this is real functionality.

But it is far below the designed workflow.

The specification requires:

1. request context;

2. customer;

3. receipt;

4. amount/balance/policy;

5. fraud context;

6. audit history;

7. decision;

8. reason.

Current approval cards mostly expose:

customer;

status;

reason code.

And the reason sent to the backend is hard-coded:

Approved from frontend shell

or equivalent.

So:

API utilization: good.
Approval UX completeness: ~45%.

---

13. Fraud is partially implemented

The frontend really lists and decides fraud flags.

But the designed fraud workspace calls for:

status filter;

severity filter;

rule filter;

branch filter;

actor filter;

customer filter;

date filter;

evidence/context;

affected transaction;

related audit;

decision reason.

Current UI is essentially a short list plus status badges and decision radio buttons.

Again:

backend wired: yes.
workflow implemented: partially.

---

14. Reports are massively under-utilized

Backend reporting is already broad.

It provides:

executive summary;

liability ageing;

customer performance;

cashier activity;

redemption summary;

SMS operations;

audit report;

pilot operations summary;

materialization state;

CSV export;

admin report refresh.

Current ReportsWorkspace calls only:

reportsControllerListExecutiveSummaryV1()

And it doesn't provide:

report selector;

branch filter;

date filters;

timezone filter;

export;

materialization/freshness;

admin refresh;

charts;

pagination/drill-down.

Utilization

Roughly:

1 report surface used
~8 report surfaces ignored
export ignored
materialization ignored
refresh ignored

This is one of the clearest examples of backend work not translating into product capability.

P1.

---

15. Pilot Health is explicitly demo data despite the API already existing

This should be fixed immediately because it can mislead an admin.

Backend already exposes:

GET /api/v1/reports/pilot-operations-summary

including:

release;

outbox backlog;

SMS failures;

offline sync failures;

open fraud;

stale reports;

reconciliation health/mismatches.

But PilotHealthPanel currently says:

> Operations summary shell — backend contract pending

and hard-codes values such as:

“Demo data”

“Shell preview”

“Preview state”

“Pending data”

The backend contract is not pending.

This UI should consume it.

P1 because operational health must never look real while being demo data.

---

16. Admin user management is partial

Backend supports:

GET /users
POST /users
PATCH /users/:id/role
PATCH /users/:id/status

The Admin panel currently supports:

list users;

change role;

change status.

But there is no staff-user creation workflow.

It therefore misses:

[Add staff member]
Name/email
Password/invite model
Role
Branch
Review
Create

And as previously found, the human-facing role selector includes SYSTEM, even though backend policy prevents SYSTEM from being assigned to human accounts.

This should be cleaned up as part of finishing the workspace.

---

17. Device management is partial; branch management is absent

Backend already provides:

Branches

GET /branches
POST /branches
PATCH /branches/:id

Devices

GET /devices
POST /devices
PATCH /devices/:id

Admin UI currently uses device list/update functionality, but:

no create device UI;

no proper device detail flow;

no attestation-secret rotation UX;

no branch list;

no create branch;

no branch edit.

The visible Admin “Settings” / “Manage devices” surfaces are largely descriptive cards/buttons rather than full workflows.

---

18. Audit is one of the better-utilized areas

Admin panel does use the audit endpoint and supports an actor filter.

Backend endpoint itself is fairly simple:

GET /api/v1/audit-logs?actorId=

So the frontend is reasonably aligned with what the endpoint currently exposes.

It still needs proper:

timeline formatting;

user identity resolution;

transaction/customer links;

readable event descriptions;

but this is not a large backend-utilization gap.

---

19. Some endpoints are correctly unused

Not every backend endpoint should get UI.

For example, the old receipt endpoints are explicitly deprecated in favor of the canonical Earn and approval endpoints.

Therefore I would not create UI for:

POST /receipts
POST /receipts/:id/approve
POST /receipts/:id/reject

The frontend is correct to use:

transactions/earn
approvals/:id/decision

instead.

Likewise background credit-expiry/outbox/worker functionality doesn't need a direct “run worker” UI. Its state belongs in customer balances, expiring-credit notices and operational health.

---

20. There are also many buttons that currently imply functionality they don't have

Examples include:

Cashier

> Open sync queue

No handler.

Supervisor

> Review approvals
> Inspect fraud queue
> Open reports

They are visual Buttons but have no navigation/actions.

Admin

> View operations
> Open audit trail
> Manage devices

Again, no navigation/action handlers.

This is exactly the type of thing that makes the UI feel static even where backend integrations exist.

If a control looks actionable, it must either work or not be rendered yet.

---

Workflow completeness matrix

This is how I would classify the current product.

Workflow Backend Frontend Utilization

Login/session Mature Wired 80%
Card lookup Mature Static input 10%
Customer search/view Mature Missing 0%
Customer register/edit/status Mature Missing 0%
Card assign/replace/status Mature Missing 0%
Earn Mature Basic API form 45%
Earn confirmation Rich response Text message only 15%
Redeem Mature Basic API form 45%
Redemption confirmation Rich response Text only 15%
Customer balance Available via backend context Missing 0%
Customer ledger/history Backend capability Missing 0%
Offline queue Mature backend + local store Count only 20%
Offline batch sync Mature Missing 0%
Approval queue Mature Wired 55%
Approval detail Mature data Minimal 25%
Fraud queue Mature Wired 55%
Fraud detail Backend data Minimal 30%
Transaction search/detail Rich backend model Placeholder 5%
Reversal Mature Missing 0%
Adjustment Mature Missing 0%
Executive report Mature Wired 55%
Other reports Mature Missing 0–10%
CSV export Mature Missing 0%
Report refresh Mature Missing 0%
Report freshness Mature Missing 0%
Pilot health Mature Demo data 0% real
Users Mature List/edit 65%
User creation Mature Missing 0%
Devices Mature List/edit 55%
Device creation Mature Missing 0%
Branches Mature Missing 0%
Audit Available Wired 60%
Public policy config Mature Unused 0%

---

The architecture problem

At the moment the frontend has been developed approximately like this:

Backend endpoint
↓
Generated client
↓
prove we can call it
↓
put a component/card on dashboard

We need to switch to:

Business workflow
↓
What does the employee need to accomplish?
↓
Which backend capabilities support that?
↓
Compose them into one usable task
↓
Handle all states
↓
Make outcome auditable

For example, Earn is not merely POST /transactions/earn.

Earn is:

card lookup +
customer context +
active balance +
public policy +
receipt capture +
earn mutation +
approval state +
transaction result +
offline fallback

That is the product workflow.

---

Recommended implementation structure

I would now stop concentrating all workflows into three enormous shell pages.

Cashier

/cashier
/cashier/earn
/cashier/redeem
/cashier/customers
/cashier/customers/[id]
/cashier/sync

Supervisor

/supervisor
/supervisor/transactions
/supervisor/transactions/[id]
/supervisor/customers
/supervisor/customers/[id]
/supervisor/cards
/supervisor/approvals
/supervisor/approvals/[id]
/supervisor/fraud
/supervisor/fraud/[id]
/supervisor/reports

Admin

Reuse appropriate supervisor-level workspaces, plus:

/admin
/admin/operations
/admin/adjustments
/admin/users
/admin/devices
/admin/branches
/admin/audit
/admin/reports

You do not necessarily need unique code for every role. The same CustomerWorkspace, for example, can expose actions according to capabilities/role.

---

Priority implementation order

I would run the next frontend phase in this order:

1. Customer/card lookup and customer detail

This unlocks almost every cashier workflow.

2. Rebuild Earn around customer/card context

lookup;

policy;

expected credit;

confirmation;

rich result;

stable idempotency.

3. Rebuild Redeem around balance/policy context

balance;

max allowed;

confirmation;

rich result.

4. Offline queue + real batch synchronization

Make backend offline-sync actually usable.

5. Transaction workspace

search/history/detail;

human-readable ledger;

dispute support.

6. Reversal + adjustment workflows

consequential confirmation.

7. Finish customer/card administration

create/edit/block;

assign/replace cards.

8. Finish approvals and fraud

real detail views;

reasons;

context/audit.

9. Replace ReportsWorkspace

all report types;

filters;

export;

materialization;

admin refresh.

10. Replace PilotHealth demo with pilot-operations-summary.

11. Finish user/device/branch administration.

12. Remove every remaining no-op button and fake dashboard metric.

---

Revised score
After auditing actual backend utilization, I would score the project differently from a generic frontend-code review.
Frontend technical foundation
82/100 — good
UI design-system implementation
~90/100 — good
Actual user workflow implementation
44/100 — incomplete
Backend capability utilization
47/100 — significantly under-utilized
Practical product frontend
55/100 — NO-GO
The backend is significantly ahead of the usable product interface.
That is actually a useful position to be in: we don't need to invent many more backend features. We need to turn the backend we already built into complete employee workflows.
The next frontend sprint should therefore be explicitly scoped as “Workflow Completion & Backend Utilization”, rather than “more UI.” Once customer/card → Earn/Redeem → Sync → transaction detail is genuinely end-to-end, the product will feel dramatically less static even before the admin/reporting areas are finished.
