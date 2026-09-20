# Unify the ShopCity Cashier design system

## Why

`docs/repo_review_73.md` identifies competing presentation owners across six Cashier pages: generated tokens, global primitives, embedded component CSS, and inline layout objects. The current branch still exhibits these problems, so repeated page-by-page styling fixes will continue to drift unless shared controls and surfaces have one owner.

This proposal establishes a permanent rule: **tokens define the brand; shared CSS defines component appearance and layout rules; React composes pages; controllers retain behavior; the backend remains the financial authority.** It is a presentation consolidation, not a rewrite of transaction or offline logic.

## What Changes

- Promote approved operational prototype values into the canonical semantic token source, regenerate CSS, preserve compatible aliases, and reject undefined/cyclic token references. Do not hand-edit generated `tokens.css`.
- Make `globals.css` a predictable import entry point with modular base, primitive, component, shell, and Cashier layout styles. Remove shared appearance from embedded `<style>` elements, inline `CSSProperties`, positional selectors, and page-specific primitive overrides.
- Standardize typography, page headers, buttons, inputs/selects, cards, tables, search/filter toolbars, status messages, action rows, workflow panels/steps, and modal presentation through existing primitives plus thin ShopCity components.
- Preserve role-aware global search, the collapsible sidebar, mobile drawer, session bootstrap, scanner ownership, and existing notification/account behavior while extracting shell presentation. Do not reinstate obsolete prototype controls.
- Migrate Overview; then Find Customer/Capture Purchase/Redeem Credit as one dependency group; then Transactions; then Sync Queue. Preserve distinct page compositions and truthful data semantics.
- Keep financial lookup/control appearance consistent through idle, loading, error, verified-card, confirmation, details, review, and outcome states. Directory discovery remains distinct from authoritative card verification.
- Replace Sync Queue's gradients, elevated cards, inline layout objects, and bespoke controls with the same operational visual language, without altering queue storage, batching, retries, confirmation safeguards, or server-result interpretation.
- Add design-system conformance checks for equivalent control variants on real routes, static style-ownership/token checks, responsive/accessibility tests, paired workflow screenshots, and final-revision evidence. Screenshot similarity alone is insufficient.

## Capabilities

### New Capabilities

- `cashier-design-system`: canonical tokens, shared presentation ownership, six-page consistency, workflow-state consistency, shell compatibility, and behavior-preserving migration.
- `design-system-conformance`: executable token/style ownership rules, computed-style equivalence, state/viewport coverage, and traceable final-revision visual evidence.

### Modified Capabilities

None. Existing financial, session, routing, data-minimization, accessibility, and offline specifications remain binding; their business requirements are not redefined by this change. The new capabilities add presentation and verification obligations.

## Scope

| Included route          | Job retained                                              |
| ----------------------- | --------------------------------------------------------- |
| `/cashier`              | Bounded activity overview and quick actions               |
| `/cashier/lookup`       | Customer discovery and authoritative card lookup          |
| `/cashier/earn`         | Capture a receipt and request credit issuance             |
| `/cashier/redeem`       | Apply authoritative available credit to a basket          |
| `/cashier/transactions` | Filter bounded activity and inspect authoritative details |
| `/cashier/sync`         | Inspect local records and reconcile offline earning       |

Shared shell and primitive consumers outside Cashier receive regression coverage, not unrelated redesigns. `/cashier/customers` remains a compatibility/navigation surface, not a seventh redesigned page.

## Non-goals

- Backend/API/Prisma/RLS changes, new endpoints, generated client changes, or deployment configuration changes.
- Financial calculation, policy, permission, session, CSRF, idempotency, scanner, request-race, or offline-storage redesign.
- A new UI framework, icon family, Tailwind/shadcn migration, or wholesale component-directory move.
- Removing operational information to make Sync Queue look cleaner; adding fake metrics or unsupported financial outcomes.
- Treating all pages as identical grids, all buttons as one size, or every workflow as an identical state machine.
- Replacing approved reference assets or accepting new screenshots without review.

## Impact

Primary files: `docs/frontend/design-system/tokens.json`; `apps/web/scripts/generate-tokens.mjs` and token checks; `apps/web/styles/**`; `apps/web/components/ui/**`; `apps/web/components/shopcity/**`; shell components; Cashier route files; workflow presentation; and frontend tests/reference evidence.

Proposal-time GitNexus on refreshed current source reports **CRITICAL** for `Button` (53 upstream symbols, 24 direct dependants, 29 processes), **HIGH** for `CashierWorkflowRoute` (4 direct, 3 processes), and **HIGH** for `VerifiedCardLookupStep` (5 total, 1 direct, 3 processes). CSS inheritance/import effects are broader than the call graph. Cross-role, login, registration, and modal regression coverage is mandatory when their shared dependencies change. Details and limitations are in `audit.md` and `docs/development/gitnexus-impact-tracker.md`.

## Relationship to existing work

This is a separate follow-on change because persistent style ownership and conformance can be implemented and accepted independently of the wider review-71 prototype adaptation. It does not archive or claim completion of that change. Preserve the newer `collapsible-sidebar-repair` and `role-aware-global-search-financial-lookup` requirements where older review-71 presentation instructions conflict. Leave `development-preview-framing` and current uncommitted Admin/Supervisor/configuration work untouched.

## Acceptance and delivery

All requirements in the two delta specifications must pass; all tasks remain unchecked until evidenced. `execution-plan.md` defines phase dependencies, concrete file targets, state matrices, verification commands, rollback, and handoff evidence. No financial or offline regression can be waived by visual approval. Implementation starts with baseline/reference capture, and completes only with reviewed conformance, functional, accessibility, and screenshot evidence tied to the final candidate revision.
