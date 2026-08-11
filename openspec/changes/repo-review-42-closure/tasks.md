## 1. Scope and evidence

- [ ] 1.1 Freeze the review 42 Sprint 4 closure scope and align it with the existing fraud/report code paths.
- [ ] 1.2 Record the affected fraud, outbox, and reporting evidence paths in the implementation notes.

## 2. Duplicate fraud evidence

- [ ] 2.1 Persist duplicate-attempt evidence in a committed path that survives the receipt-blocking exception.
- [ ] 2.2 Keep the receipt uniqueness behavior unchanged for the actual financial operation.
- [ ] 2.3 Add regression coverage for duplicate-attempt evidence persistence.

## 3. Fraud evaluation lifecycle

- [ ] 3.1 Emit fraud.evaluate for ordinary qualifying high-value earn/redemption cases.
- [ ] 3.2 Add a terminal fraud delivery state or processed marker so recovery does not replay completed fraud events.
- [ ] 3.3 Keep SMS outbox recovery behavior intact while adding the fraud lifecycle.
- [ ] 3.4 Add regression coverage for one-time fraud processing and recovery cutoff.

## 4. Reporting correctness

- [ ] 4.1 Derive purchase value from authoritative receipt amounts instead of earn credit amounts.
- [ ] 4.2 Make report snapshots respect the requested asOf/watermark boundary.
- [ ] 4.3 Make credit-issued and reversal metrics reversal-aware using reversesEntryId relationships.
- [ ] 4.4 Keep report export surfaces aligned with the corrected materializer output.

## 5. Validation

- [ ] 5.1 Run the targeted fraud, reporting, and integration suites.
- [ ] 5.2 Update OpenSpec artifacts if the final implementation scope shifts during validation.
