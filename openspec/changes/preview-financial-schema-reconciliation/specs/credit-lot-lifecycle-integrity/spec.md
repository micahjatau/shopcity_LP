## ADDED Requirements

### Requirement: Expiry evidence, ledger debit, and lot balance commit atomically

A credit expiry MUST be recorded as one confirmed `EXPIRY`/`DEBIT` ledger entry and one immutable `CreditExpiry` record for the same tenant, customer, lot, integer-kobo amount, and expiry instant. At commit, the lot's remaining amount MUST equal its original amount minus redemption allocations plus restorations minus expiry evidence.

#### Scenario: Valid due credit expires

- **WHEN** a due lot with positive remaining credit is expired
- **THEN** the transaction MUST commit one matching expiry debit and immutable expiry row, set remaining credit to zero, preserve the original earn and allocation history, and write the audit event atomically

#### Scenario: Expiry debit is missing or mismatched

- **WHEN** an expiry ledger entry has no matching expiry evidence, references a receipt, uses the wrong direction/type/customer/amount/timestamp, or disagrees with the lot
- **THEN** the deferred database invariant MUST reject the transaction and roll back every write

#### Scenario: Lot balance does not reconcile with all evidence

- **WHEN** a transaction changes a lot, allocation, restoration, or expiry without satisfying `original - allocations + restorations - expiries = remaining`
- **THEN** the deferred database invariant MUST reject the transaction

#### Scenario: Expiry evidence is updated, deleted, or duplicated

- **WHEN** a write attempts to modify or delete expiry evidence or create a second expiry for the same lot
- **THEN** the database MUST reject the write and preserve the original expiry evidence

#### Scenario: Repeated expiry invocation

- **WHEN** the same expiry sweep is invoked again after one successful expiry
- **THEN** it MUST create no additional debit, expiry row, audit row, or balance change
