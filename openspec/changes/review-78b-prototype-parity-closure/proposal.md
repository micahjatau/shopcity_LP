# Change: Close Review 78b prototype-to-React parity gaps

## Why

`docs/repo_review_78b.md` (Sections 1–6, especially “Screen-specific corrections” A–I) confirms that the branch has a substantially reconstructed frontend, but the remaining acceptance gaps are concentrated in truthful presentation states, evidence quality, and a few route compositions. A follow-up change is needed to close those gaps without starting another frontend rewrite or changing backend financial behavior. The review's two-part contract—presentation parity plus production fidelity—is authoritative for this proposal.

## What changes

- Make login role selection truthful: supported roles remain Cashier, Supervisor, and Admin; backend-returned identity remains authoritative.
- Correct Overview metric labels, zero/unavailable rendering, and bounded-feed wording.
- Complete explicit DOM-structure and page-content parity for Find Customer, Capture Purchase, and Redeem Credit, including review/outcome states.
- Reconcile Register Customer into a focused route-level composition while retaining the shared customer workspace for search/detail/card management.
- Validate Transactions density, dialog composition, mobile behavior, and bounded-history language.
- Certify the shared shell and role-aware search before page-specific work; keep notification/avatar surfaces bounded to presentation and do not claim deferred issue #45 functionality.
- Certify Sync Queue as an explicitly derived production design rather than claiming nonexistent prototype parity; preserve IndexedDB, device binding, and reconciliation behavior.
- Freeze same-SHA prototype/React comparison inputs and publish structure, geometry, behavior, accessibility, role, and responsive evidence.
- Use the functioning `shopcity-lp` preview or local servers for comparison; keep the alternate `web` preview's `/login` 500/function-invocation failure as a separate deployment issue, not visual parity evidence.
- Preserve registration retry/idempotency semantics so an uncertain response does not silently become a new logical registration request.

## Scope boundaries

In scope: `apps/web` presentation components, route composition, frontend tests, prototype comparison evidence, and OpenSpec/release documentation.

Out of scope: backend services, database schema, API contracts, authentication/session authority, RBAC policy, financial calculations, ledger history, offline reconciliation semantics, and queue processing semantics.

## Acceptance criteria

- Login cannot imply that selecting an unsupported role changes the authenticated role; its brand/header, sign-in card, field order, password toggle, and CTA retain the approved prototype grouping.
- Each mapped route preserves the approved page-content order and stable landmarks: shared shell/topbar; page heading; route-specific action/search region; content cards or workflow stages; table/footer or outcome region; and dialog hierarchy where applicable.
- Overview renders `0` for loaded zero values, reserves `—` for unavailable values, and describes the bounded activity feed truthfully.
- Earn and Redeem preserve their distinct prototype-derived stage hierarchy and width/content differences; pending, failed, uncertain, and offline states remain truthful.
- Customer discovery never grants financial authorization before active-card verification; preserve exact card lookup, masking, stale-response handling, keyboard selection, focus restoration, deep-link handoff, and branch/tenant scope.
- Cashier Overview preserves the intentional restriction that Cashier cannot register customers, even if the prototype shows an active Register Customer action.
- Registration has a focused `/supervisor/customers/new` and `/admin/customers/new` composition, or an explicitly approved equivalent, without inventing unsupported prototype fields or changing registration authority; uncertain retries preserve the existing logical idempotency request.
- Transactions retains bounded-history semantics and uses prototype-derived table/detail-dialog structure.
- Sync Queue is documented and tested as a derived composition with accessible reading order.
- Comparison evidence uses the same route, role, state, viewport, browser, and candidate SHA; React snapshots are not treated as prototype proof.
- Existing frontend quality, accessibility, RBAC, financial, offline, and queue safeguards remain passing.
- Prototype comparison uses the existing `Landing-1.png` through `Landing-18.png`/prototype reference inventory and deterministic intercepted responses; prototype scripts are never run against live customer accounts.
