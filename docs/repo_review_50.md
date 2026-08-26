Worked for 7m 50s

ShopCity repo review — frontend-development

Current head: ac067eb02b1deaed99cd0be3869749195fca7341 — fix: point vercel at web app
Compared against: master at f57c691b9b939110b67bcfa20266214c08a28906
Branch delta: 27 commits ahead, 0 behind

The branch has progressed substantially since the design-system documents were created. It now contains a real Next.js application foundation, token generation, ShopCity assets, primitives, browser/offline infrastructure, API/session helpers, Playwright fixtures, accessibility tests and visual baselines.

But the implementation is not yet close to the state implied by release-readiness.md. The biggest gaps are not visual polish; they are financial input correctness, authentication/authorization, real workflow integration, durable offline guarantees, and immutable CI evidence.

Scorecard

Area Score Status

Design-system specification 91/100 PASS
Brand/assets/tokens implementation 14/15 Strong
Primitive/product components 8/15 Partial
API/session/security integration 6/15 Major gaps
Role shells + actual workflows 4/20 Mostly placeholders
Offline/scanner foundation 6/10 Promising, unsafe failure handling
Accessibility/testing 7/15 Good framework, weak evidence
CI/governance/release evidence 4/10 Incomplete
Full frontend implementation 49/100 NO-GO for completion/release

Gate decision

GO to continue frontend implementation on frontend-development.

NO-GO to call the frontend complete, release-ready, or ready for integration into master.

Your design-system specification itself has crossed the quality threshold. The implementation has not.

---

P1 findings

1. Money input currently has a financial correctness bug

This is the most important source-code issue I found.

MoneyInput currently normalizes commas by replacing them with decimal points:

const normalized = cleaned.replace(/,/g, '.');

That means a normal Nigerian entry such as:

1,234

can become:

1.234

and eventually approximately ₦1.23 instead of ₦1,234.00.

The parser also finishes with:

Math.round(parsed * 100)

so inputs requiring more than two decimal places are silently rounded rather than rejected. In addition, Money calls Math.abs(amountKobo) when formatting. If a negative amount is supplied without signed={true}, the visual output becomes positive while its accessibility label can still say “negative.”

That directly contradicts the design-system requirements to safely handle Nigerian money-entry patterns, reject malformed or ambiguous amounts and never silently round submitted financial amounts.

Severity: P1.

Do not wire this component into Earn, Redeem, Adjustment or any other financial mutation until it has an explicit input grammar and comprehensive tests.

At minimum, test:

1234, 1,234, 1234.50, 1,234.50, ₦1,234.50, 0.01, 0, negative input, multiple separators, 1.234,50, 12.345, excess decimals, whitespace and pasted formatted currency.

---

2. Authentication exists as infrastructure, but the actual application is unprotected

There is a useful session foundation. The API helper already performs /auth/me, coordinates refresh through a single refreshPromise, and avoids parallel refresh storms.

But the actual login page explicitly remains a stub. Its copy says the session integration is coming “later,” and the Sign in button is type="button" with no login action.

More seriously, the shell layout itself says authenticated session context will be consumed later and provides links directly to Cashier, Supervisor and Admin.

SessionBootstrap merely renders:

Checking session

Session ready

Sign in required

Session check unavailable

It does not gate children or redirect unauthorized users.

And AppShell exposes all four role routes in the same navigation.

So today:

/auth/me
↓
session status label
↓
NO route protection
NO role boundary
NO role-based navigation

That is unacceptable once these screens begin exposing real operations.

Severity: P1.

The correct next layer is:

Login
↓
authenticated session provider
↓
role + branch context
↓
protected application layout
├── CASHIER
├── SUPERVISOR
└── ADMIN

The backend remains authoritative for authorization, but the frontend must prevent accidental or misleading access as well.

---

3. The claimed critical E2E suite does not actually exercise ShopCity workflows

This needs to be corrected before the test suite gives false confidence.

The Playwright suite says it covers login/session, earning, redemption, approvals, offline, fraud, reports and revocation. But after the basic login-page keyboard test, it navigates to:

/testing/critical-flows

and checks static fixture content.

That route describes itself as:

> Playwright fixtures

and renders predefined states such as:

Earn confirmed

Duplicate detected

Redeemed

Insufficient balance

Fraud review

Fresh report

Device revocation

without executing the corresponding backend operations.

So these are useful component/workflow-state fixtures, but they are not true E2E tests.

Yet release-readiness.md currently states that critical Playwright flows pass for those scenarios.

Severity: P1 evidence-integrity gap.

Keep /testing/critical-flows; it is useful for deterministic visual and interaction regression. Just do not classify it as business-flow E2E.

Real critical E2E needs to perform operations against either:

1. a seeded test backend, preferably; or

2. contract-faithful intercepted API responses where full integration is impractical.

At minimum, Earn and Redeem should eventually be backend-integrated because they are the financial core.

---

4. Offline persistence can fail silently

The IndexedDB structure itself is good. It preserves:

local ID;

idempotency key;

cashier;

branch;

device;

card;

receipt;

purchase amount;

occurrence time;

sync state;

error;

server transaction/approval IDs.

That aligns well with the design-system offline model.

The problem is failure handling.

saveOfflineEarnRecord() catches any storage failure and simply returns. The same pattern exists for updates and deletes; reads turn storage failures into an empty queue or zero count.

For ordinary UI preferences, that pattern could be tolerable. For a financial offline transaction it is dangerous.

Imagine:

Cashier enters ₦50,000 purchase
↓
UI says "saved offline"
↓
IndexedDB quota/security/write failure
↓
catch {}
↓
record was never durable

The caller has no way to distinguish success from failure.

The design system explicitly states that offline financial records require durable browser storage.

Severity: P1 before offline Earn is enabled.

Persistence APIs should return an explicit result or throw. The cashier should never receive “Saved on device” until the transaction has actually committed locally.

---

P2 findings

Frontend CI is not actually enforcing the documented frontend release gates

The root repository already defines web:lint, web:typecheck, web:test, web:a11y:test, web:critical:test, web:visual:test and web:build.

The web app itself also exposes these commands.

But .github/workflows/ci.yml still runs the existing backend-focused validation pipeline and does not install the separate apps/web lockfile or execute those frontend gates.

For the exact current SHA, GitHub currently exposes no normal Actions run through the commit-run lookup. The commit has two Vercel statuses: one ShopCity deployment is green and another attached ShopCity project is red.

That means the release-readiness document represents local validation evidence, not immutable current-SHA frontend CI certification.

I would add a dedicated job such as:

Frontend Checks
npm ci --prefix apps/web
token drift
frontend lint
frontend typecheck
a11y
production build
Playwright critical
visual regression

The Playwright browsers also need an explicit CI installation step.

---

Accessibility automation deliberately disables contrast testing

The axe helper contains:

'color-contrast': { enabled: false }

So “axe passes” does not currently prove the WCAG color-contrast part of the design-system target.

This is particularly relevant because the design documentation makes contrast an explicit requirement.

If JSDOM limitations are why the rule was disabled, that is fine—but then contrast must be covered by browser-level axe/Playwright or another explicit test, and release evidence should say so.

---

The component library is only a fraction of the approved v1 surface

The design-system primitive list includes Dialog, Sheet, Popover, DropdownMenu, Tooltip, Tabs, Accordion, Badge, Progress, Skeleton, Separator, Toast, Alert, Table and Pagination in addition to the basic form controls.

The actual UI barrel currently exports only:

Button

Checkbox

Combobox

Input

RadioGroup

Select

Textarea

The ShopCity component layer is similarly early: Money/MoneyInput, three identity components and status badges exist, but much of the approved product-component surface does not.

There is also no Storybook dependency in the current web package even though the approved Definition of Done requires stories for shared components.

This is not architectural failure—it simply confirms that the implementation is still early.

---

The custom Combobox needs another accessibility pass

The custom combobox already handles keyboard arrows, Enter and Escape, which is a good start.

But it does not currently implement aria-activedescendant; its aria-selected state tracks the highlighted option rather than necessarily the selected value; and each role="option" contains its own button.

That is not yet a strong WAI-ARIA combobox/listbox implementation.

Given the design-system accessibility target, I would either use a well-tested owned Radix-style implementation or bring this component fully in line with the APG behavior before widespread use.

---

The role screens are still demonstrators, not product workflows

The Cashier page itself labels Lookup, Earn, Redeem, Customers and Sync as "Route placeholder" and displays hardcoded shift values.

Supervisor currently displays fixed approval/fraud/transaction statuses and static cards.

Admin contains route placeholders as well.

PilotHealthPanel is particularly important: it describes itself as a backend operations summary, but its values are hardcoded:

12 pending
98% delivered
2 failed
Fresh

The component is visually useful, but it should not look operationally authoritative until it consumes the real pilot-operations contract.

---

OpenSpec tracking has drifted from reality

The current task file has sections 1–8 largely unchecked, including work that has clearly already started or partially landed, while sections 9–11 contain many completed checks.

More importantly, some checked items—especially the “critical flow” coverage and release readiness—represent weaker evidence than their wording suggests.

That means the tracker currently cannot be used as an accurate completion score.

Before the next implementation phase, reconcile each item into:

DONE
PARTIAL
NOT STARTED
BLOCKED

and only use [x] for actual acceptance-criterion completion.

---

The API→screen document is not yet the mapping its index promises

The README describes document 06 as:

> Backend endpoint → role → screen → component → UX-state mapping

But the actual document currently maps broad domains and endpoint families, not individual HTTP operations, roles, states and mutation behaviors.

For example, the final form should eventually look more like:

Operation Roles Screen Component Mutation policy Success Key errors

POST /.../earn Cashier Earn EarnTransactionForm idempotent Confirmed/Pending approval duplicate/conflict/offline
POST /.../redeem Cashier Redeem RedeemTransactionForm online only Confirmed/Pending insufficient balance/cap
approval decision Supervisor Approval detail ApprovalDecisionPanel consequential confirmation Approved/Rejected stale policy/conflict

That becomes very valuable once feature development accelerates.

---

The implemented technology stack and documented stack have diverged

The engineering specification proposes Tailwind, Radix/shadcn, TanStack Query/Table, React Hook Form, Zod, Lucide and Storybook.

The web app currently has only Next/React at runtime and testing/tooling dependencies around them.

This does not mean those libraries must all be installed immediately. But make a deliberate decision now:

either adopt the agreed stack, or amend the design-system specification.

Avoid slowly building hand-rolled equivalents while the source-of-truth documents continue to promise another architecture.

---

What is working well

The design foundation itself is quite strong.

The design-system documentation clearly establishes that transaction confidence, backend authority, accessibility, offline states, auditability and semantic tokens are first-class concerns.

The brand implementation now has the actual runtime SVG assets rather than .gitkeep only, and the branch comparison shows the four expected brand assets plus README.

The API request adapter correctly centralizes credentials: 'include', optional CSRF injection and Idempotency-Key handling.

The session layer’s single-flight refresh mechanism is a good design choice.

The error classifier already separates validation, business rules, conflict, session, connectivity and unexpected errors.

The scanner foundation is also sensible: it explicitly scopes scanner contexts and avoids intercepting keyboard input while the user is typing in inputs, textareas or content-editable elements.

And importantly, the frontend is still isolated from master. The current delta primarily adds the frontend and adjusts repository/build configuration rather than modifying the established financial domain implementation.

---

What I would do next

1. Fix the money boundary first. Establish a tested Nigerian currency parser, make negative display impossible to misrepresent, reject excessive precision and add a full money unit-test matrix.

2. Complete auth and role enforcement. Wire the actual login operation, session context, logout/refresh, protected route layout, branch context and cashier/supervisor/admin navigation boundaries.

3. Build one real vertical slice before expanding components: Customer/card lookup → Earn → backend response → confirmation/pending-approval UI. Then Redeem. This will validate the API adapter, error dictionary, idempotency policy, money components and role shell together.

4. Make offline persistence trustworthy. Failed IndexedDB writes must surface as failures; then implement queue submission/reconciliation using the original idempotency key.

5. Split fixture tests from true E2E. Keep /testing/critical-flows for screenshots and component states; create real backend-connected Playwright flows separately.

6. Put frontend verification into GitHub Actions. No frontend release claim should depend only on a developer machine.

7. Finish the shared foundation required by the first real workflows, especially dialogs/alerts/tables/loading/error states, then add Storybook rather than trying to build every component up front.

8. Reconcile OpenSpec and release-readiness docs. The tracker should describe what is actually implemented, not what fixtures demonstrate.

9. Complete browser accessibility validation, particularly contrast, combobox semantics, focus trapping/dialogs and narrow viewports.

10. Remove generated repository noise such as the committed apps/web/tsconfig.tsbuildinfo and add *.tsbuildinfo to .gitignore.

---

Final verdict

The work since the design-system planning phase is meaningful. You now have a real frontend engineering foundation, not just documentation.

But I would not continue by building more dashboard cards or more visual placeholders.

The critical path is now:

money correctness
↓
authentication + RBAC
↓
real generated-client integration
↓
Earn vertical slice
↓
Redeem
↓
durable offline Earn
↓
Supervisor workflows
↓
Admin/report workflows
↓
true E2E + frontend CI

Current gate

Design system: 91/100 — PASS.

Frontend implementation against the approved full scope: 49/100 — NO-GO for completion/release.

Decision: continue implementation on frontend-development, but do not merge/certify it yet.

The next review should be much narrower: auth + money + one real Earn vertical slice + frontend CI. Once those four are closed, the score should move sharply rather than spending another cycle polishing static shells.
