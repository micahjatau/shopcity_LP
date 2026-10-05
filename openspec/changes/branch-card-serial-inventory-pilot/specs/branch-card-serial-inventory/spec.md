## Purpose

Provide versioned card-serial generation and auditable branch-owned stock so one pilot branch can automatically issue verified physical cards during registration and replacement without manually typing serials.

## ADDED Requirements

### Requirement: Serial format is versioned and editable

The system MUST generate serials only from an explicitly configured, versioned format profile. The format profile MUST use constrained declarative fields rather than arbitrary executable expressions or unrestricted regular expressions. A profile change MUST create a new version; it MUST NOT rewrite serials already generated, printed, or issued. The barcode payload MUST equal the stored serial string, preserving leading zeros.

#### Scenario: No approved profile exists

- **GIVEN** no version-1 profile has been approved for the pilot
- **WHEN** an operator attempts to generate a stock batch
- **THEN** the system refuses generation with an actionable configuration error
- **AND** it does not fabricate or allocate a serial.

#### Scenario: Profile changes after stock exists

- **GIVEN** stock batches or issued cards refer to an earlier profile version
- **WHEN** an authorized administrator changes the serial format
- **THEN** a new profile version is created and audited
- **AND** existing serials and batches retain their original values and profile version.

### Requirement: Generated serials are held as branch-owned physical stock

The system MUST track generated serials separately from issued Card history and bind each batch to one tenant, branch, and profile version. A serial MUST become available for assignment only after the corresponding physical card has been received and verified against the print/encoding manifest. Serial uniqueness MUST be enforced across branches within the tenant.

#### Scenario: Batch is generated and received

- **GIVEN** an authorized administrator creates a batch for the selected pilot branch
- **WHEN** physical cards are received and their barcode payloads match the manifest
- **THEN** only the verified items move to AVAILABLE stock in deterministic intake order.

#### Scenario: Batch item does not match its manifest

- **GIVEN** a received card's scanned barcode does not match its generated manifest item
- **WHEN** the mismatch is recorded
- **THEN** the item is quarantined and cannot be assigned.

### Requirement: Every card issue automatically assigns available branch stock

Initial registration, assignment to an existing customer, and replacement MUST allocate the next eligible AVAILABLE serial from the trusted operating branch without accepting a serial from the client. Registration stock claim, customer/card creation, consent, audit, and idempotency response MUST be atomic. Card assignment and replacement stock claims MUST be atomic with their existing card/audit/idempotency transactions. A repeated idempotent request MUST return the original assignment.

#### Scenario: Registration succeeds with stock

- **GIVEN** the registration branch has available verified stock
- **WHEN** the Supervisor confirms registration
- **THEN** the next stock item is assigned to the new card in the existing atomic registration transaction
- **AND** the response and success UI show the exact barcode serial.

#### Scenario: Registration has no available stock

- **GIVEN** the registration branch has no available verified stock
- **WHEN** the Supervisor confirms registration
- **THEN** the system returns a clear stock-unavailable error
- **AND** it creates no customer, card, consent, or partial stock claim.

#### Scenario: Existing customer receives a card

- **GIVEN** the authorized operating branch has available verified stock
- **WHEN** a Supervisor assigns a card to an existing eligible customer
- **THEN** the system claims the next available serial without a manually entered serial
- **AND** retries do not consume another stock item.

### Requirement: Replacement consumes new stock and preserves the old serial

Card replacement MUST allocate a distinct AVAILABLE serial from the authorized servicing branch, retain the old Card record as REPLACED, link it to the new Card, and preserve existing audit and outbox behavior. A replaced, blocked, or reported issued-card serial MUST NOT return to AVAILABLE stock solely because a timeout elapsed.

#### Scenario: Card is replaced

- **GIVEN** the servicing branch has available verified stock
- **WHEN** an authorized Supervisor confirms replacement
- **THEN** the next distinct stock serial is assigned to the replacement Card
- **AND** the old Card and serial remain in history and are not reusable.

### Requirement: Reservation timeout cannot recycle issued cards

A timeout MAY release only an unissued RESERVED stock item. Before release, the system MUST establish that it was not handed out and is physically present and usable; uncertain items MUST be quarantined. Timeout processing MUST be idempotent and audited.

#### Scenario: Unissued reservation expires

- **GIVEN** a stock item is reserved but has not been issued or encoded for handover
- **WHEN** its configured reservation timeout expires
- **THEN** it returns to AVAILABLE only after physical reconciliation confirms it is still usable stock.

#### Scenario: Reported or blocked card ages past timeout

- **GIVEN** a card was issued and is now reported or blocked
- **WHEN** any reservation timeout elapses
- **THEN** its serial remains unavailable to new customers and stays associated with its Card history.
