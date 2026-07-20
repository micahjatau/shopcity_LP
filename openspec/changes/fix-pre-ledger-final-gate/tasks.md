## 1. Redis Throttling

- [ ] 1.1 Introduce a shared Redis client that supports authenticated and TLS-enabled Redis URLs and use it from the throttle layer.
- [ ] 1.2 Update login throttling to enforce IP, account, and pair buckets, and keep card lookup buckets stable across serial changes.
- [ ] 1.3 Add real Redis integration tests that verify fail-closed behavior and multi-bucket rate limiting.

## 2. Bootstrap Hardening

- [ ] 2.1 Enforce the stronger bootstrap password policy in the seed path, including explicit rejection of the documented placeholder and weak defaults.
- [ ] 2.2 Update the example environment file, README, and local setup guide to document the required Supabase credentials and bootstrap password expectations.
- [ ] 2.3 Add bootstrap tests that cover placeholder rejection, weak-password rejection, and missing Supabase credentials.

## 3. Audit System Actor Safety

- [ ] 3.1 Update the audit write path so system-generated events can persist with null actor fields while human actors remain tenant-local.
- [ ] 3.2 Fix the migration to drop the legacy audit foreign key name and keep the composite actor constraint consistent.
- [ ] 3.3 Add integration tests for actorless system events and for cross-tenant audit rejection.

## 4. Card Serial Contract

- [ ] 4.1 Change the public card DTO/OpenAPI contract to use `serialNumber` while preserving internal storage mapping as needed during migration.
- [ ] 4.2 Update card lookup, create, and replace tests to assert the `serialNumber` public contract and the absence of `barcodeValue` in the API schema.
- [ ] 4.3 Verify card lookup and replacement still work end-to-end after the contract switch.

## 5. Receipt Record Finalization

- [ ] 5.1 Expand the receipt schema to carry tenant, operational context, and idempotency fields, with optional external receipt reference support.
- [ ] 5.2 Implement the receipt capture contract so duplicate client submissions are deduplicated rather than creating a second record.
- [ ] 5.3 Add migration and integration tests for optional external receipt numbers and idempotent retry behavior.
