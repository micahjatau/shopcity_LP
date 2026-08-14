# 02 — Accessibility & Interaction

## Accessibility baseline

Target **WCAG 2.2 AA**. Shared interactive components must work with keyboard, pointer/touch and assistive technology before acceptance.

Required rules:

- semantic HTML first;
- visible focus on every interactive element;
- focus must not be obscured by sticky/fixed UI;
- WCAG target-size minimum is a floor; ShopCity primary operational targets should normally be 44–48px;
- normal text contrast ≥4.5:1 and large text ≥3:1;
- color never carries meaning alone;
- meaningful heading hierarchy;
- persistent input labels;
- field errors programmatically associated with controls;
- important asynchronous status changes announced appropriately;
- dialogs contain focus and restore it to the trigger;
- reduced-motion preference respected;
- no hover-only functionality.

Use WAI-ARIA Authoring Practices for combobox, dialog, menu, tabs and related widgets.

## Focus system

Default focus treatment is a visible 2px information-blue ring with a 2px surface offset. Never remove the browser outline without an equivalent indicator.

For multi-field validation, focus the error summary first and let its links move focus to invalid fields. When a modal closes, restore focus to the initiating control unless the workflow deliberately advances elsewhere.

## Touch, mouse, keyboard and scanner

Assume mixed input on ShopCity devices: barcode/QR scanner, physical keyboard, mouse and touch display.

Primary transaction controls should normally be at least 44px high and preferably 48px on cashier surfaces. Dense admin controls may be smaller only while satisfying target-size/spacing requirements.

Potential shortcuts can be introduced after usability testing:

```text
Alt+E     Earn
Alt+R     Redeem
Alt+C     Customer lookup
/         Search
```

Shortcuts are enhancements, never the only interaction path.

## Form architecture

Standard field anatomy:

1. persistent label;
2. optional hint/help;
3. control;
4. validation message;
5. optional format support.

Prefer one-column operational forms. Do not use placeholder text as the only label. If most fields are required, mark optional fields instead of decorating every field as required.

Validation uses both field-level messages and an error summary for multi-field submissions. Do not use toast notifications as the primary validation mechanism.

`MoneyInput`, phone, receipt, date/time and search controls receive domain-specific formatting and validation. Avoid browser numeric spinners for money.

## Search and lookup

Canonical customer/card/receipt lookup behavior:

- label states accepted identifiers;
- input supports keyboard and scanner entry;
- typed query survives loading/error states;
- server text search is debounced;
- card scans may submit immediately when the screen is in scan mode;
- results are keyboard navigable;
- combobox semantics follow WAI-ARIA APG;
- results show differentiating context such as masked phone/card, branch and balance;
- no-match and search-failed states are distinct.

## Asynchronous state model

Every remote-data component accounts for:

- initial loading;
- background refresh;
- success;
- empty;
- partial data;
- stale;
- offline;
- error;
- permission denied.

Use skeletons when layout is predictable and an in-button spinner for short mutations. Do not blank an entire screen during background refresh.

Financial submits follow:

```text
ready → processing → confirmed | awaiting approval | domain failure | uncertain/offline outcome
```

Disable duplicate clicks while a request is active, but preserve the logical operation's backend idempotency key; the disabled button is not the financial safety mechanism.

## Error taxonomy and recovery

Frontend behavior maps stable backend error codes to user-facing patterns.

### Validation

`VALIDATION_ERROR` uses field errors and an error summary where necessary.

### Business-rule failure

Examples include `INSUFFICIENT_BALANCE`, `REDEMPTION_BASKET_CAP_EXCEEDED` and `APPROVAL_POLICY_CHANGED`. Present a persistent callout explaining what happened and the next allowed action.

### Conflict

Examples include `RECEIPT_ALREADY_USED`, `IDEMPOTENCY_CONFLICT` and `SYNC_RECORD_CONFLICT`. Do not blind-retry. Explain the conflict and reconcile with server state.

Preferred wording:

> **Receipt already recorded**  
> This receipt has already been captured. No additional credit was created.

### Session/access

Authentication-required or revoked-device responses move the user through deliberate reauthentication. Preserve only safe local work and never expose authentication material in the interface.

### Connectivity

For eligible offline earning:

> **You're offline**  
> This earn transaction is saved on this device and will sync when the connection returns.

Operations not permitted offline explicitly say that connectivity is required.

### Unexpected failure

Show a support/reference identifier when available and offer controlled retry only when safe.

## Offline-first UX

Connectivity states:

```text
Online
Connection unstable
Offline
Synchronizing
Sync failed
```

Offline earn record states:

```text
Saved on device
Waiting to sync
Syncing
Confirmed
Awaiting approval
Rejected
Retry required
```

A persistent sync indicator is required whenever unsynced records exist. Never rely on a disappearing toast.

Example:

```text
Offline — 3 transactions saved locally
Last successful sync: 2 minutes ago
[View sync queue]
```

Each queue row shows local time/reference, customer/card context, receipt, amount, state, retryability, server transaction/approval ID when available, and a human-readable error. A mixed batch is represented per record. Redemption remains online-only unless backend policy changes.

## Notification hierarchy

| Mechanism      | Use                               |
| -------------- | --------------------------------- |
| Toast          | transient low-risk confirmation   |
| Inline alert   | persistent contextual issue       |
| Banner         | system-wide state such as offline |
| Dialog         | explicit decision                 |
| Activity/inbox | work requiring later action       |

Financial confirmation remains on-screen as a result, not only as a toast.

## Destructive and consequential actions

Use three risk levels:

- **Level 1 — reversible/minor:** immediate action may be acceptable.
- **Level 2 — consequential:** confirmation with target and result.
- **Level 3 — financial/security sensitive:** explicit action, amount/customer/transaction context, reason where supported, actor context and unambiguous destructive label.

Level 3 applies to adjustments, reversals, rejecting approvals, card replacement/disable, customer disable, device access changes and consequential fraud decisions.

Do not use generic `Yes`, `OK` or `Submit` when an action label can say `Reverse ₦5,000.00`, `Reject request`, or `Replace card`.

## Date, time and timezone

Backend timestamps remain ISO/UTC data. Display in the relevant operational timezone.

Normal display:

```text
13 Aug 2026, 7:22 AM
```

Where ambiguity matters:

```text
13 Aug 2026, 7:22 AM WAT
```

Reports state their timezone. Audit views favor absolute timestamps; relative time may supplement but not replace them.

## Content design

Tone is **short, specific, operational, calm and nontechnical**.

Prefer `Credit added`, `Awaiting supervisor approval`, `Receipt already used`, `Saved offline`.

Avoid exposing implementation language such as raw enum names or HTTP status descriptions when clearer user language exists.

Buttons describe the action: `Add credit`, `Redeem credit`, `Approve request`, `Reject request`, `Replace card`, `Export CSV`.

## Privacy and security UX

- Mask phone/card identifiers when full values are unnecessary.
- Do not place unnecessary customer data in browser URLs.
- Reauthentication states are explicit.
- Security-sensitive views show actor, branch and device attribution where available.
- Role authorization remains server-side; hiding UI is only a usability layer.

## Scanner behavior

Scanner input must not unexpectedly take over an active text or money field. A scanner adapter should route scans only in contexts that advertise scan support, preserve ordinary keyboard accessibility, provide visible success/failure feedback and tolerate duplicate scan events without weakening backend protections.

## Print and receipt behavior

V1 includes print styles even if hardware integration comes later. Print views hide navigation/actions; preserve transaction reference, customer-safe identifier, amount, date, branch and state; use black-on-white output; avoid background-dependent meaning; and omit sensitive/internal security data.

## Automated accessibility gates

Recommended baseline:

- `eslint-plugin-jsx-a11y`;
- Storybook accessibility checks;
- Playwright with axe on critical routes;
- keyboard-only workflow tests for login, lookup, earn, redeem and approval;
- manual screen-reader spot checks before major releases.
