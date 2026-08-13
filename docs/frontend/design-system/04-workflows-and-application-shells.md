# 04 — Workflows & Application Shells

## 1. Information architecture by role

Authorization remains server-enforced. Navigation visibility is a UX convenience based on authenticated role.

### Cashier

```text
Home
Earn
Redeem
Customers
Sync
```

Characteristics:

- transaction-first landing page;
- large controls;
- minimal secondary navigation;
- persistent connection/sync state;
- recent local/current-shift activity where the API allows it;
- no administrative clutter.

### Supervisor

```text
Overview
Transactions
Customers
Cards
Approvals
Fraud
Reports
```

Characteristics:

- branch operations;
- approval/fraud attention queues;
- customer/card support;
- operational reports.

### Admin

```text
Overview
Transactions
Customers
Cards
Approvals
Fraud
Reports
Operations
Audit
Users & Devices
Settings
```

Characteristics:

- cross-branch visibility where authorized;
- pilot health/reconciliation;
- audit;
- system configuration/master data.

## 2. Application shell

Desktop supervisor/admin:

- fixed/collapsible left navigation;
- compact brand header/logo;
- page title/action region;
- light content canvas;
- user/role/branch/device context accessible but not dominant.

Cashier:

- simpler shell optimized for measured POS resolution;
- always-visible connection/sync indicator;
- one-click access to Earn and Redeem;
- minimal nesting.

Mobile:

- compact drawer or task-specific bottom navigation where justified;
- never squeeze the desktop sidebar into a phone layout.

## 3. Earn workflow

Canonical flow:

```text
Identify customer/card
        ↓
Verify active state
        ↓
Enter/scan receipt
        ↓
Enter purchase amount
        ↓
Review expected credit/context
        ↓
Submit with unique idempotency key
        ↓
CONFIRMED | PENDING_APPROVAL | domain error | offline capture
```

### Confirmed

Result remains visible and shows:

- customer;
- receipt;
- purchase amount;
- credit earned;
- new available balance;
- expiry date;
- SMS state;
- transaction reference;
- `New transaction` / `View customer` next action.

### Awaiting approval

Do not present as failure. Show request/approval context, customer/receipt/amount and wording that does not imply credit is already spendable if the backend says otherwise.

### Duplicate receipt

Do not auto-resubmit. Explain that no additional credit was created and offer investigation/navigation where possible.

### Offline earn

If connectivity is lost before a definitive server response, preserve the logical operation and idempotency context. Eligible offline earns enter the local queue with local ID, device/actor, receipt/purchase and occurred-at context.

## 4. Redeem workflow

Canonical flow:

```text
Identify customer/card
        ↓
Show active available balance
        ↓
Enter basket amount
        ↓
Enter requested redemption
        ↓
Display policy/cap context
        ↓
Explicit review/confirmation
        ↓
CONFIRMED | PENDING_APPROVAL | rule failure
```

Confirmation includes basket amount, requested redemption, maximum allowed when useful, expected/resulting balance, receipt and customer/card.

Insufficient-balance and basket-cap errors remain in context and preserve editable values.

Redemption is not offered as an offline action unless backend policy explicitly changes.

## 5. Approval workflow

Approval list emphasizes:

- age/expiry of request;
- target type (earn/redeem);
- requested amount;
- customer/branch/receipt;
- reason/policy code.

Detail review order:

1. request context;
2. customer and receipt;
3. amount/balance/policy;
4. fraud context where available;
5. audit history;
6. approve/reject decision;
7. reason entry where required/useful.

`APPROVAL_POLICY_CHANGED` gets dedicated explanatory UX rather than a generic server error.

## 6. Fraud workflow

Queue supports status, severity, rule, branch, actor, customer and date filters.

High severity is prominent but never color-only.

Detail shows rule/severity, affected transaction/customer/actor, returned evidence/context, related audit activity, prior decisions where exposed, and decision/reason controls.

Do not expose fraud/security heuristics to cashier roles unless the backend contract explicitly authorizes it.

## 7. Offline sync workflow

Persistent connection indicator links to the queue. Default ordering is oldest unsynced first.

Each record shows:

- local capture time;
- customer/card;
- receipt;
- purchase;
- sync state;
- retryability;
- server transaction/approval when available;
- rejection/retry reason.

Batch outcomes remain per record:

```text
CONFIRMED
PENDING_APPROVAL
REJECTED
RETRYABLE
```

A partially successful batch is not collapsed into one global failure.

## 8. Customer workflow

Cashier:

- search/list;
- view customer;
- use customer/card in Earn/Redeem.

Supervisor/admin:

- register;
- edit;
- status changes;
- assign/replace/manage card.

Customer detail prioritizes identity/status, active card, available balance, expiring credit, transaction history and role-appropriate actions.

## 9. Card workflow

Card lookup is high-frequency and scan-friendly.

Replacement is a guided consequential flow:

1. confirm customer/current card;
2. explain old-card effect;
3. capture new serial;
4. review;
5. replace;
6. show clear result.

Status changes use confirmation when access to loyalty credit is affected.

## 10. Adjustments and reversals

These are level-3 financial actions. Show original transaction/customer, current consequence, amount, reason, actor context and final confirmation.

Never present an adjustment as a shortcut for a failed ordinary transaction.

## 11. Reports workflow

Shared report shell supports:

- executive summary;
- liability ageing;
- customer performance;
- cashier activity;
- redemption summary;
- SMS operations;
- audit report;
- materialization state;
- pilot operations summary.

CSV export is secondary. Admin refresh is described as scheduling/refresh behavior, not a promise that data is immediately rebuilt.

## 12. Responsive behavior

### POS / desktop — 1200+

- two-column context + action where it improves speed;
- main form remains visually narrow enough to scan;
- large submit controls;
- customer/balance context can remain visible alongside Earn/Redeem.

### Tablet — 768–1199

- navigation collapses;
- forms mostly one column;
- supporting detail may use a sheet;
- tables prioritize columns before horizontal scroll.

### Mobile — 360–767

- supports lookup/supervision without pretending to be an ideal POS;
- dense records become stacked key/value layouts;
- sticky action regions must not obscure focus/errors;
- financial confirmation remains readable without horizontal scrolling.

## 13. Dashboard rules

### Cashier home

Focus on Earn, Redeem, customer/card lookup and offline/sync status. Do not add decorative analytics that slow down the primary task.

### Supervisor overview

Answer:

- What needs approval?
- What fraud/sync issue needs attention?
- Is branch loyalty operation healthy?
- What happened today?

### Admin overview

Answer:

- Is financial reconciliation healthy?
- Are queues/SMS/reports healthy?
- Are there cross-branch anomalies?
- Which operational gate needs action?

## 14. Security UX

Show useful operational attribution:

```text
Performed by  Ada Okafor · Cashier
Branch        Wuse II
Device        POS-03
Time          7:14 AM WAT
```

Session/device revocation interrupts protected actions and moves the user to reauthentication. Role-based hiding/disable behavior is a UX layer; backend authorization remains authoritative.

## 15. Auditability and dispute support

Transaction detail exposes a human-readable event timeline. Financial state and communication state remain separate.

Example:

```text
Credit confirmed
SMS delivery failed
```

A failed SMS must never visually imply that a confirmed financial transaction failed.

## 16. Branded vs working surfaces

Brand-rich surfaces:

- login;
- splash;
- loyalty-card visual;
- empty/onboarding states;
- compact navigation brand tile.

Neutral working surfaces:

- earn/redeem forms;
- approval/fraud review;
- customer data;
- tables;
- reports;
- audit;
- operational health.

This balance preserves ShopCity identity while keeping a high-frequency retail tool legible.
