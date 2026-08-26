Worked for 5m 28s

frontend-development repo review

I reviewed the current branch against the approved role-aware sidebar + dedicated workflow routing spec.

Current head: 301ca0ba63752b1c27003b8705985b46e29a888a — fix(web): stabilize contract flow navigation.
Branch vs master: 126 commits ahead, 0 behind. master remains at the original backend split point.

The sidebar work is real and the architecture has improved, but the OpenSpec change was archived too early. Several tasks marked complete are demonstrably incomplete.

Current score

Area Score Assessment

Design-system architecture 92/100 Strong
Navigation registry 92/100 Strong
Cashier route decomposition 78/100 Routes exist, pages still overloaded
Supervisor navigation 86/100 Mostly functional
Admin navigation 62/100 Broken links present
Shared workflow architecture 55/100 Page-level coupling remains
Responsive sidebar 58/100 Rail not actually implemented
Mobile navigation accessibility 65/100 Partial
Backend utilization 90/100 Strong
Testing/evidence 68/100 Claims exceed evidence
Operational readiness 78/100 NO-GO

---

P1 — the Admin sidebar contains routes that do not exist

This is the clearest blocker in the new navigation.

The canonical registry exposes:

/admin/transactions
/admin/approvals
/admin/fraud
/admin/customers

alongside the existing Admin routes.

But the actual Admin route tree contains:

adjustments
audit
branches
cards
devices
operations
reports
users
page.tsx

and does not contain transactions, approvals, fraud, or customers.

I also directly checked /admin/transactions/page.tsx and /admin/approvals/page.tsx: neither exists.

So we currently have:

Sidebar
↓
Transactions
↓
/admin/transactions
↓
404

This is exactly what the navigation registry was supposed to prevent.

Required fix

Create real role wrappers backed by shared workflows:

/admin/transactions
→ TransactionWorkspace

/admin/approvals
→ ApprovalsWorkspace

/admin/fraud
→ FraudWorkspace

/admin/customers
→ CustomerManagementWorkspace

Do not fix this by importing Supervisor pages directly.

---

P1 — shared workflow extraction was not actually completed

The archived task list says:

> Extract shared workflow components for cross-role reuse
> Remove page-level reuse between roles

and marks both complete.

But /supervisor/customers still does:

import CashierCustomersPage from '../../cashier/customers/page';

export default function SupervisorCustomersPage() {
return <CashierCustomersPage />;
}

And /supervisor/cards does the same thing.

Inside that supposed Cashier page, management permissions are inferred from the URL:

const canManage = pathname?.startsWith('/supervisor') ?? false;

That's backwards architecturally.

It means a page called CashierCustomersPage simultaneously contains:

Cashier read-only behavior;

Supervisor customer management;

Supervisor card management;

and decides which product it is based on pathname.

Better boundary

CustomerWorkspace
├── search
├── detail
├── ledger
└── card display

CustomerManagementWorkspace
├── CustomerWorkspace
├── status mutations
├── card assignment
└── card replacement

Then:

/cashier/customers
<CustomerWorkspace />

/supervisor/customers
<CustomerManagementWorkspace ... />

/admin/customers
<CustomerManagementWorkspace ... />

Capabilities should be explicit props or centrally resolved permissions—not pathname inference.

---

P1 — the “collapsed sidebar” is not actually collapsed

The implementation has a Collapse button, but it does not produce the icon rail specified in the design.

The navigation item type doesn't even contain an icon property.

When collapsed, AppSidebar only hides:

the workspace subtitle;

the footer.

The actual navigation labels remain fully displayed.

More importantly, the main shell grid remains:

grid-template-columns:
minmax(240px, 280px)
minmax(0, 1fr);

regardless of sidebarCollapsed.

So:

Expanded → ~240–280px
Collapsed → still ~240–280px

The button changes some cosmetics but doesn't reclaim workspace width.

Tablet is also not the specified rail

At 768–1199 px the layout simply changes to:

grid-template-columns:
208px
minmax(0, 1fr);

The specification called for approximately 68–76 px icon rail.

Yet OpenSpec marks:

> Implement tablet collapsed rail behavior

as complete.

It isn't.

---

P1 accessibility — the mobile drawer is not a real modal focus trap

Some good work exists:

initial focus moves to Close;

Escape closes;

focus returns to Menu.

But there is no focus trap.

The only key handler is:

if (event.key === 'Escape') {
closeMobileNavigation();
}

There is no Tab/Shift+Tab containment and no inert/equivalent treatment on the background application.

So a keyboard user can potentially:

open drawer
↓
Tab through drawer
↓
Tab into background application

while the drawer still claims:

role="dialog"
aria-modal="true"

The browser accessibility test only verifies focus-on-open and Escape-to-close; it never attempts to tab outside the dialog.

Yet OpenSpec marks the accessible drawer/focus-management requirements complete.

Required test

Open drawer
→ repeatedly Tab
→ focus never leaves drawer

Shift+Tab from first focusable
→ wraps to last

Escape
→ drawer closes
→ focus returns to Menu

---

P1 — the Admin navigation registry and Admin homepage disagree

The new sidebar says Admin has:

Overview

Operations
Transactions
Approvals
Fraud

Customers
Cards
Adjustments

Reports
Audit

Users
Devices
Branches

But the Admin homepage still maintains a separate adminRoutes/adminRouteCards system containing only:

Operations
Users
Devices
Cards
Branches
Audit
Reports
Adjustments

That means there are now two navigation sources of truth.

This undermines the exact architectural reason we introduced shellNavigationByRole.

The home dashboard may have workflow launch cards, but those should either derive from the canonical registry or deliberately represent a smaller set of quick actions. They should not maintain another parallel route registry.

---

P1/P2 — the dedicated Cashier pages still aren't very dedicated

The new routes exist:

/cashier/lookup
/cashier/earn
/cashier/redeem

and the ?card= deep-link rehydration concept is implemented. The Earn wrapper is clean and passes the card serial into the workflow component.

That's good.

But all three routes share one 606-line CashierWorkflowRoute that renders almost the same large page:

Page header
Policy context
Lookup
Action summary
Customer detail
Recent ledger
Shift snapshot
Connection status
Sync status
Route links
Then maybe Earn/Redeem form

So /cashier/earn is not really:

Customer/card context
↓
Earn
↓
Result

It is still effectively the previous Cashier megascreen plus an Earn form.

And /cashier/lookup includes an “Action summary” containing:

Open overview

Open lookup

Go to Earn

Go to Redeem

Open sync queue

That is primary navigation duplicated inside the workflow page—the exact thing the sidebar spec intended to remove.

Better split

CashierLookupWorkspace

Lookup
Customer/card result
[Earn] [Redeem] [View customer]

CashierEarnWorkspace

Customer/card context
Earn policy summary
Earn form
Result

CashierRedeemWorkspace

Customer/card context
Balance/redemption limits
Redeem form
Result

The common data-loading logic can be extracted into a hook/context component without forcing all three pages to render the same UI.

---

P2 — Cashier home still duplicates the sidebar

/cashier now correctly no longer embeds full Earn/Redeem forms.

That's a meaningful improvement.

But the page still defines:

const cashierRoutes = [
Overview,
Lookup,
Earn,
Redeem,
Customers,
Sync queue
]

and renders them as a horizontal route bar.

That's exactly the navigation now provided by the sidebar.

The page also adds several explanatory cards such as:

Dedicated routes

Lookup first

Backend contracts

These are useful during development but not particularly useful to a cashier trying to work.

The eventual overview should be much more operational:

Good morning

Main Branch · POS-03 · Online

[Earn credit]
[Redeem credit]
[Find customer]

2 transactions waiting to sync

with only backend-supported shift information below.

---

P2 — the “compact” topbar is still a large header

The new topbar removed horizontal primary navigation, which is good.

But visually it still contains:

1. large ShopCity brand row;

2. session status;

3. connectivity;

4. sync;

5. signout;

6. three large context cards:

Shell context

Workspace

Branch and policy

So after introducing a left sidebar, we're still consuming a large vertical area with the old header information.

The intended architecture was closer to:

Earn credit Main Branch · POS-03 · Online User ▾

The sidebar should own branding/workspace identity; the topbar should become operationally compact.

---

P2 — sidebar says “Branch and device” but does not show a device

AppSidebar labels its footer:

> Branch and device

but renders:

{branchLabel}
{branchTimezone}

AppShell doesn't pass deviceId at all; it only destructures:

status
role
sessionLabel

from session bootstrap.

So the UI claims to provide device context but actually provides branch + timezone.

Either change the label or, preferably, actually surface:

Main Branch
POS-03
Africa/Lagos

Device identity is operationally important enough to deserve that space.

---

P1 operational — normal UI login still does not create a device-bound session

This previous issue remains open and matters for the offline workflow.

The browser LoginForm submits only:

loginWithCredentials({ username, password })

And loginWithCredentials calls the generated login client using a normal request with no device headers.

The backend session contract now correctly exposes:

session.deviceId

but a normal username/password browser login can still produce deviceId: null.

Offline Earn then stores whatever device ID was provided—potentially undefined.

And the Sync workflow explicitly refuses to operate without an authenticated device ID.

So:

Real cashier LoginForm
↓
username/password only
↓
deviceId = null
↓
network fails
↓
offline Earn may be stored
↓
Sync Queue
↓
"Authenticated device ID is unavailable"

The automated live E2E can perform device-attested login manually, but that isn't the same as the real UI supporting the workflow.

I would still consider Offline Earn non-pilot-ready until normal POS login is bound to the registered device.

---

P1 testing — the login regression test was weakened

This is important because we've already had a real “Sign in button doesn't work” incident.

Before the latest commit, the contract test did:

click Sign in
→ expect URL /cashier

The latest commit changed that to:

click Sign in
→ page.goto('/cashier')
→ verify Cashier overview

That means the test now passes even if the Sign in button never navigates anywhere.

The implementation still calls:

router.replace(routeByRole[role])

but the regression test stopped proving it.

Restore the contract

The E2E should assert:

Fill username
Fill password
Click Sign in

NO manual page.goto

expect /cashier
expect Cashier Overview

If that test is flaky, fix the underlying routing/session synchronization. Do not work around it by navigating manually.

---

P2 governance — the archived OpenSpec is not truthful

The sidebar change is archived with every task checked.

At least these checked items are not actually complete:

Archived task Reality

Shared workflow components extracted Supervisor still imports Cashier page
Page-level role reuse removed Still present
Tablet collapsed rail Not an icon rail
Accessible mobile drawer No focus trap
Focus management Partial only
Skip link I found no shell skip-link implementation
Remove page-local primary navigation Cashier still duplicates routes
Compact AppTopbar Still large
Visual regression for expanded/collapsed/drawer Existing visual test only captures generic “role shells”
Admin shared workflow routes Registry points to missing pages

The visual test currently has a single role-shell screenshot and no explicit expanded-sidebar, collapsed-rail or mobile-drawer screenshots.

I would reopen/supersede the archived change with a small navigation-closure change rather than letting [x] become disconnected from reality.

---

What is working well

The architecture is going in the right direction.

The navigation registry is a meaningful improvement. It cleanly separates human roles, prevents SYSTEM from receiving a registry, handles exact home matching, and selects the longest matching active route for nested routes.

The Cashier navigation now correctly contains:

Overview
Lookup
Earn
Redeem
Customers
Sync queue

which matches the intended information architecture.

The sidebar's sync badge is also backed by the actual offline queue rather than fake metrics, and explicitly distinguishes queue-read failure from an empty queue.

The dedicated Cashier route wrappers are clean, and ?card= deep linking correctly starts authoritative backend lookup instead of passing an entire stale customer object between screens.

SYSTEM handling remains correctly fail-closed.

And the intended shopcity-lp Vercel deployment is successful at the current SHA. The duplicate shopcity Vercel context is unfortunately still failing, so deployment status remains noisy rather than globally clean.

---

Updated overall assessment

The sidebar work has improved the product architecture, but I would not accept the current OpenSpec closure as the final implementation.

Before sidebar project

The weakness was:

> Too many workflows crammed into role homepages.

Now

The weakness is:

> The navigation architecture exists, but the implementation stopped halfway between the old page architecture and the new one.

That is much easier to fix.

Recommended closure sequence

1. Create the four missing Admin routes

Transactions

Customers

Approvals

Fraud

2. Extract real shared workflow components

Customer

Card

Transaction

Approval

Fraud

3. Replace Supervisor imports of CashierCustomersPage.

4. Make shellNavigationByRole the only application-navigation source of truth.

5. Remove Cashier/Admin duplicate route grids.

6. Split the 606-line CashierWorkflowRoute into focused Lookup/Earn/Redeem composition.

7. Implement true sidebar collapse:

icons;

~72px rail;

content grid width changes;

accessible labels/tooltips.

8. Make tablet default to the actual rail.

9. Add proper mobile focus trap + inert background + skip link.

10. Reduce AppTopbar to compact operational context.

11. Surface actual deviceId in the shell.

12. Restore the real Login → role-route E2E assertion.

13. Finish device-attested cashier login for Offline Earn.

14. Add a test that iterates every sidebar href and proves it resolves rather than 404s.

15. Add dedicated visual baselines for:

expanded sidebar;

collapsed rail;

tablet;

mobile drawer.

16. Reconcile OpenSpec and exact-head CI evidence.

Gate

Frontend implementation: 86/100 — GO

The architectural direction is right and there is no reason to redesign it.

Sidebar/workflow architecture fidelity: 69/100 — PARTIAL

The core shell exists, but several acceptance criteria are not truly implemented.

Operational readiness: 78/100 — NO-GO

The Admin sidebar currently contains broken destinations, Offline Earn is still not achievable through a normal device-bound UI login, and the mobile/rail accessibility implementation is incomplete.

The next review should be navigation closure only, not another broad repo audit. Closing those 16 items—especially the first 9—should get this architecture over the 90% threshold without reopening the product's broader frontend design.
