## ADDED Requirements

### Requirement: Public card APIs must use serialNumber terminology
The system MUST expose the public card identifier as `serialNumber` in request and response schemas.

#### Scenario: Card creation uses serialNumber
- **WHEN** a client creates a card
- **THEN** the public request contract uses `serialNumber`

#### Scenario: Card replacement uses serialNumber
- **WHEN** a client replaces a card
- **THEN** the public request contract uses `serialNumber`

#### Scenario: Card lookup exposes serialNumber
- **WHEN** the API returns card identity information
- **THEN** the public response contract uses `serialNumber`

### Requirement: Legacy barcode naming must not remain public contract
The system MUST keep `barcodeValue` out of the public API contract unless a migration-specific exception is explicitly documented.

#### Scenario: OpenAPI omits barcodeValue
- **WHEN** the OpenAPI document is generated for card endpoints
- **THEN** the public card schema does not expose `barcodeValue`
