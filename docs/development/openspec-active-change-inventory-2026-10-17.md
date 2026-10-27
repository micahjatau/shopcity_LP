# OpenSpec Active-Change Inventory

**Snapshot date:** 2026-10-17  
**Repository:** `shopcity_LP`, branch `workflow-states-implementation`, baseline HEAD `9ae97bcee0cf9132c716431819124f45d1e9a285`  
**Status:** Initial, scoped inventory for `repo-review-closure`; not a complete artifact-by-artifact audit and not evidence that listed work is implemented or accepted.

`openspec list` reported **53 active changes** at inspection time. OpenSpec artifact/task status is workflow metadata only; it does not prove source behavior, CI, owner approval, or runtime acceptance. No changes were archived based on this inventory.

## Clusters and disposition

### Repo-review generations

- `repo-review-57-cashier-release-hardening` (25/31 tasks) and `repo-review-58-release-certification` (11/41): related cashier/release work, but distinct scope cannot be excluded from titles/progress alone. Retain pending task-by-task evidence.
- `repo-review-66-master-lineage-certification` (10/18), `repo-review-67-runtime-certification` (52/56), and `repo-review-69-release-candidate-closure` (12/25): active lineage/runtime/release gates. Retain until exact-SHA, runtime and task evidence is reviewed.
- `repo-review-71-prototype-exact-frontend-adaptation` (22/29) and `repo-review-78-prototype-first-frontend-reconstruction` (29/60): related active frontend work; retain pending scope reconciliation and acceptance evidence.
- `repo-review-74-consolidation-exploration`, `repo-review-79-frontend-ux-remediation`, and `repo-review-80-supervisor-customer-card-workflows` were shown complete in the inventory. Completion indicators alone are insufficient for archival; verify implementation/test/visual evidence and remaining gates first.
- `repo-review-closure` is the current umbrella for the review findings. Its planning artifacts are complete, but implementation and runtime/owner gates remain open.

### Cashier and Supervisor UI

Active changes include `align-cashier-layouts-to-prototype`, `review-76-frontend-design-convergence`, `review-78b-prototype-parity-closure`, `supervisor-customer-table-profile-workflow`, `supervisor-operational-reports-dashboard`, and `collapsible-sidebar-repair`, alongside active repo-review generations above. Related design lineage does not by itself prove duplicate scope. Retain unfinished changes; establish exact ownership/supersession in the proposals/specs before archive.

Several related work items were reported complete, including `cashier-conformance-closure`, `cashier-transactions-sync-navigation-cleanup`, `cashier-ui-review`, `repo-review-79-frontend-ux-remediation`, `repo-review-80-supervisor-customer-card-workflows`, `supervisor-approval-centre-redesign`, and multiple Supervisor dialog/presentation changes. Validate their source/test/browser evidence before archival.

### POS auth: WebAuthn and DEVICE_TOKEN

- `browser-pos-webauthn-attestation` (39/53) and `simplify-pilot-pos-device-authentication` (29/31) are both active.
- The current pilot direction is DEVICE_TOKEN, with HMAC_LEGACY/WEBAUTHN mode exclusivity retained where supported. `browser-pos-webauthn-attestation/proposal.md` now explicitly says it is not the current pilot path, superseding only the **WebAuthn pilot requirement** while retaining separate compatibility and future hardware-qualification scope. This does not qualify the DEVICE_TOKEN runtime.
- Keep the DEVICE_TOKEN change open until task 5.4 final diff/GitNexus evidence and authorized staging/physical-POS acceptance are complete. No staging prerequisites or acceptance are inferred here.

### SMS providers

`africastalking-plain-sms-provider`, `arkesel-v2-sms-provider`, and `twilio-programmable-sms-provider` were reported complete. They are distinct providers, not duplicates. Their artifact completion does not prove authorized provider delivery acceptance, DLR behavior, or no-duplicate handling in production. Preserve provider-specific runtime evidence gates.

### Customer consent

`customer-registration-consent-capture` was reported complete, but product/legal approval of retention, export/deletion and consent wording remains outstanding. The new review dialog displays the captured loyalty and marketing choices; that does not approve the notice wording, retention statement, or authoritative version source. Keep consent/legal approval open.

### Fraud review

`fraud-review-results-presentation` has a separate visual-review gate (task 4.4). Its current reported state requires an actual browser visual pass after the configured Chromium executable is restored. Automated visual tests or unrelated CI results are not substitutes for this checkbox or for staging acceptance.

## Archive and closure rules

Before archiving any completed or superseded change:

1. Inspect its exact proposal, delta specs, tasks, implementation diff and verification evidence.
2. Record explicit scope/supersession and where the accepted requirements now live.
3. Resolve owner and runtime gates; do not infer from age, a newer change name, `openspec status`, or checked boxes alone.
4. Validate OpenSpec after any reconciliation/archive operation and preserve unrelated working-tree state.

## Follow-up

This snapshot is intentionally not a complete audit of all 53 change directories. The `repo-review-closure` governance task remains open until the relevant overlaps have been inspected at artifact level and each retain/supersede/archive decision is recorded with evidence.
