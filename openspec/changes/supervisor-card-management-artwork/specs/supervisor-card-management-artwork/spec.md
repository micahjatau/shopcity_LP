## ADDED Requirements

### Requirement: Supervisor card management displays live card artwork

After a Supervisor or Admin explicitly selects a card and its current details are authoritatively reloaded, Manage cards MUST show a recognizable ShopCity card preview containing that card's exact serial number, linked customer name, and current card status. The preview MUST be derived only from the authoritative selected card, MUST NOT display static example identity/serial data from a design image, and MUST NOT change selection, authorization, or lifecycle behavior. Any barcode-like decoration MUST be non-functional and MUST NOT represent an identifier.

#### Scenario: Verified card is shown for identification

- **GIVEN** a card candidate has been explicitly selected and its current details successfully reloaded
- **WHEN** the management details are displayed
- **THEN** the card preview shows the selected card's authoritative serial number, customer name, and card status
- **AND** the existing textual details and operation confirmation continue to identify the same serial and customer.

#### Scenario: Lifecycle refresh updates the card preview

- **GIVEN** an explicitly selected card has been blocked or reactivated
- **WHEN** the existing lifecycle operation succeeds and current details are reloaded
- **THEN** the preview reflects the reloaded card status
- **AND** the preview does not itself enable or authorize an operation.

#### Scenario: No verified card is selected

- **GIVEN** the user has not selected a candidate or authoritative verification failed
- **WHEN** the management workspace is displayed
- **THEN** no card preview with live identity details is shown.
