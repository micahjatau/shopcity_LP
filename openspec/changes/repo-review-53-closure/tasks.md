## 1. Auth, roles, and SYSTEM handling

- [ ] 1.1 Remove SYSTEM from human admin navigation and route exposure.
- [ ] 1.2 Make empty/unsupported route groups non-authorizing by default.
- [ ] 1.3 Block SYSTEM from interactive human UI login flows.
- [ ] 1.4 Restore the production auth throttle policy to the master baseline.
- [ ] 1.5 Remove the committed admin password fallback from live E2E coverage.
- [ ] 1.6 Require explicit secure credentials for any live admin test run.

## 2. Device/session trust

- [ ] 2.1 Expose the authenticated device context in session/bootstrap data.
- [ ] 2.2 Persist and reuse the real device identity instead of inventing a browser-local fallback.
- [ ] 2.3 Regenerate the frontend client/types after any device/session contract change.
- [ ] 2.4 Ensure offline sync uses the same authenticated device identity as login.

## 3. Offline Earn and sync correctness

- [ ] 3.1 Fail Earn visibly when local persistence fails instead of claiming local save success.
- [ ] 3.2 Ensure offline Earn records use a valid cashier UUID, branch UUID, device UUID, receipt-week value, and idempotency key.
- [ ] 3.3 Align offline queue states with the batch API eligibility rules.
- [ ] 3.4 Make failed local/offline records retriable instead of stranded.
- [ ] 3.5 Preserve record identity and rejection reasons across partial batch success/failure.

## 4. Cashier and receipt lookup truthfulness

- [ ] 4.1 Narrow receipt lookup copy to the supported identifier, or implement real receipt lookup.
- [ ] 4.2 Ensure cashier lookup and earn handoff paths carry truthful customer/card context.

## 5. Supervisor and admin operational surfaces

- [ ] 5.1 Allow Supervisor to view materialization state.
- [ ] 5.2 Keep materialization refresh and admin-only actions restricted to Admin.
- [ ] 5.3 Correct Pilot Health zero-failure semantics.
- [ ] 5.4 Add approval queue pagination and filtering.
- [ ] 5.5 Expose receipt-week-start-day in branch create/update forms.
- [ ] 5.6 Add adjustment consequence preview with customer context and projected balance.

## 6. Release and evidence hygiene

- [ ] 6.1 Add a live e2e covering device login, card lookup, Earn, offline save, reconnect, sync, and backend confirmation.
- [ ] 6.2 Remove duplicate deployment-status noise and keep one authoritative deployment view.
- [ ] 6.3 Reconcile the OpenSpec tracker with the actual state of the branch.
- [ ] 6.4 Validate exact-head CI status for the branch before closure.
