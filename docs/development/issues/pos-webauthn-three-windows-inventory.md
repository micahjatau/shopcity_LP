# Issue: Repeatable development lifecycle and three-Windows inventory

**Status: PARTIAL — local development opt-in implemented; browser lifecycle testing and hardware inventory remain open**

**Scope:** Exercise disposable development devices repeatedly. Three Windows computers are a proposed future test cohort, not verified ShopCity POS units or qualified hardware.

## Why this issue exists

The requester clarified that the current goal is development testing: create and remove devices repeatedly to verify the lifecycle, not to perform production cutover. The existing Admin device UI supports creating an `UNPAIRED` device, pairing on the target browser, credential revocation, and device deactivation/reactivation. “Remove” should mean revoke credentials and deactivate the device; retain the record and audit history rather than hard-delete it.

Runtime enrollment was guarded only by `WEBAUTHN_DEVICE_QUALIFICATION_APPROVED`. A separate `WEBAUTHN_DEV_ENROLLMENT_ENABLED` opt-in is now implemented for `NODE_ENV=development`; it defaults off and configuration rejects it in test, staging, or production. The production approval flag remains separate. This opt-in preserves database/state checks, challenge consumption, origin/RP validation, cryptographic verification, and MDS trust checks. Use synthetic metadata only at an isolated test boundary; it is not Windows hardware evidence.

OpenSpec tasks 1.1, 2.1, and 7.1 still require an evidence-backed physical inventory before device classification, supported-combination decisions, or migration planning. The requester is not physically present, so no machine-specific details have been verified. Do not infer missing values from this issue or from development database records.

## Inventory to collect

For each physical computer, record the asset tag or serial and map it to the authoritative ShopCity device ID and branch, if applicable. Collect:

- Manufacturer, model, and whether this is an actual cashier POS or a test machine.
- Windows edition, version, build, and update status.
- Browser name, version/channel, and evidence of its managed-browser policy/configuration.
- Authenticator type (for example Windows Hello or an external FIDO2 key), model and firmware when available, and relevant backup/sync and attestation capabilities.
- Current backend device status and binding mode, verified against the matching device record. Classify a device as `HMAC_LEGACY` only with explicit, approved evidence; otherwise do not infer it. Never include raw HMAC secrets, private keys, passwords, or assertion payloads.
- Collection date, collector, evidence source, unknowns, and any unsupported behavior.

| Unit | Asset tag / serial | ShopCity device ID | Branch  | POS or test | Make/model | Windows edition/version/build | Browser/version/channel | Managed policy evidence | Authenticator/model/firmware | Status/mode verified? | Evidence source/date |
| ---- | ------------------ | ------------------ | ------- | ----------- | ---------- | ----------------------------- | ----------------------- | ----------------------- | ---------------------------- | --------------------- | -------------------- |
| 1    | Pending            | Pending            | Pending | Pending     | Pending    | Pending                       | Pending                 | Pending                 | Pending                      | Pending               | Pending              |
| 2    | Pending            | Pending            | Pending | Pending     | Pending    | Pending                       | Pending                 | Pending                 | Pending                      | Pending               | Pending              |
| 3    | Pending            | Pending            | Pending | Pending     | Pending    | Pending                       | Pending                 | Pending                 | Pending                      | Pending               | Pending              |

## Completion criteria

### Development lifecycle

1. Local development can create several disposable `UNPAIRED` device records through the existing Admin flow.
2. Automated tests exercise pairing and cashier assertion flows with the virtual authenticator and test-local synthetic metadata only; they retain real transaction, challenge, origin/RP, credential, and state checks.
3. Credential revocation and device deactivation invalidate the expected sessions. Reactivation follows the existing credential requirements, and test cleanup preserves audit/history instead of deleting records.
4. Any separate dev-only enrollment setting is impossible to enable in production and is documented as non-qualification behavior.

### Physical Windows inventory (separate, blocked track)

1. Each computer is physically identified and mapped to its ShopCity device record and branch, or explicitly recorded as a test machine with no production device record.
2. Actual OS/browser/management/authenticator combinations are documented with dated, attributable evidence. Unknown values remain marked unknown.
3. Supported, unsupported, and untested combinations are distinguished; inventory scope is not presented as a complete fleet inventory unless Operations confirms it is complete.
4. Any device-mode classification is verified against authoritative records and the approved classification policy. No secret material is copied into this record.
5. Security and Operations review the inventory before it is used to select a WebAuthn profile or migration plan.

## Safety and qualification boundary

Development fixtures and virtual-authenticator tests are behavior evidence only; they do not prove hardware backing, non-exportability, non-syncability, attestation trust, or a specific register identity. Do not use development settings against production, alter shared/production device state, or hard-delete devices and audit history. Real Windows-device testing and the inventory remain separate, approval-gated qualification work. Production remains **NOT QUALIFIED — NO-GO**.

## Next action

Next, exercise the local opt-in with the full browser lifecycle (create, pair, cashier assertion, revoke/deactivate, and retry) using only local/test data; do not use the flag in shared or production environments. When physical access or operator-supplied evidence becomes available, fill the three inventory rows and update the qualification register. Until then, inventory-dependent OpenSpec tasks stay open.
