## ADDED Requirements

### Requirement: Customer records must support email identity
The system MUST support customer email as part of the identity and lookup model before ledger work begins.

#### Scenario: Customer email is stored and searchable
- **WHEN** a customer is created or updated with an email address
- **THEN** the system stores the email and can search by it

#### Scenario: Customer lookup remains stable across identifiers
- **WHEN** a customer is searched by name, phone, email, or card serial
- **THEN** the system returns the same customer record when identifiers match

### Requirement: Card identifiers must use serial-number terminology
The system MUST use serial-number terminology consistently for the card identity exposed by the API and domain model.

#### Scenario: Card identity is labeled as serial number
- **WHEN** the API exposes card lookup or assignment fields
- **THEN** the identity field uses serial-number terminology

#### Scenario: Legacy barcode naming is not the public contract
- **WHEN** the pre-ledger model is finalized
- **THEN** barcode-oriented naming is not the public-facing contract unless explicitly retained by decision

### Requirement: Receipt versus sale-record semantics must be resolved before ledger work
The system MUST define whether the pre-ledger record is a receipt reference or a sale record before implementing earnings and redemptions.

#### Scenario: Ledger-input record shape is decided
- **WHEN** implementation begins for earnings or redemptions
- **THEN** the repository has a clear decision on the record shape and naming

#### Scenario: External POS reference remains optional
- **WHEN** the chosen record shape is implemented
- **THEN** an external POS reference is optional, not a required trust boundary unless explicitly decided
