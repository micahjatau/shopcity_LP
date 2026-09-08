# Tasks

## Diagnostics

- [x] Add safe request-correlated diagnostics for unexpected API exceptions.
- [ ] Verify Vercel logs contain diagnostic classification and request ID without sensitive material.
- [ ] Reproduce smoke-session 500s and identify the concrete persistence or dependency exception.
- [ ] Reproduce customer-ledger 500s and identify the concrete query, relation, schema, or serialization exception.

## Repair and tests

- [ ] Apply the smallest confirmed runtime/configuration/code/schema repair.
- [ ] Add regression coverage for the smoke-session failure mode.
- [ ] Add regression coverage for the ledger failure mode and reconciliation response.
- [ ] Run targeted unit/integration tests, lint, and build.

## Certification

- [ ] Deploy the repaired master-lineage candidate with complete staging configuration.
- [ ] Verify frontend and backend report the exact candidate SHA.
- [ ] Run staging smoke and verify no unexpected 500 responses.
- [ ] Run three consecutive exact-SHA certifications and preserve release evidence.
