## 1. Receipt policy alignment

- [x] 1.1 Align receipt-week validation and derivation to the same weekday convention.
- [x] 1.2 Update branch/config validation messages and tests for the accepted weekday range.
- [x] 1.3 Add regression coverage for the `0` weekday case and the invalid range case.

## 2. Purchase ceiling enforcement

- [x] 2.1 Introduce a hard maximum for `purchaseAmountKobo` in configuration and validation.
- [x] 2.2 Enforce the ceiling in the receipt capture path before review-status routing.
- [x] 2.3 Add tests for amounts below, at, and above the ceiling.

## 3. Device attestation

- [x] 3.1 Define the device attestation model and persist the minimum credential material needed for verification.
- [x] 3.2 Require a valid attestation during login/session binding.
- [x] 3.3 Add tests for valid, missing, and invalid device attestation.

## 4. Migration tracker hygiene

- [x] 4.1 Add the current schema migration to `docs/database/migration-tracker.md`.
- [x] 4.2 Record the backup/restore verification status for the change.
- [x] 4.3 Verify the receipt migration upgrade path still passes after the schema work.
