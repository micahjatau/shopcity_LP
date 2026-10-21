## Purpose

Define the read-only, cashier-scoped redemption activity shown while a cashier is finding a customer for a new credit redemption.

## ADDED Requirements

### Requirement: Redeem lookup shows recent cashier redemptions

The Cashier Redeem Credit Find Customer stage MUST show a read-only table of up to six `REDEEM` entries from the existing, current-cashier activity response, in the response's recent-first order. The table MUST show customer name, receipt number, amount, and outcome. It MUST omit `EARN` rows, customer contact details not returned by this projection, and raw ledger or audit metadata. It MUST remain within the existing authenticated cashier, branch, and business-day scope and MUST NOT imply complete historical coverage.

#### Scenario: Recent activity contains mixed earn and redemption receipts

- **WHEN** the current cashier activity response contains both `EARN` and `REDEEM` entries
- **THEN** the table displays only the returned `REDEEM` entries, up to six, in their returned order
- **AND** a combined settlement appears once as one receipt row

#### Scenario: The current response page has no redemption entries

- **WHEN** the current cashier activity response contains no `REDEEM` entries
- **THEN** the table displays an honest empty state instead of earn rows or fabricated activity

### Requirement: Redemption amounts and outcomes are truthful

The table MUST distinguish confirmed debits from requests that have not completed. A confirmed row MUST display the authoritative confirmed redeemed amount; a non-confirmed row MUST NOT describe its requested amount as redeemed. Status labels MUST reflect the returned redemption outcome. If an amount is unavailable or invalid, the row MUST state that the amount is unavailable rather than calculate or infer it.

#### Scenario: Redemption is confirmed

- **WHEN** a returned redemption has confirmed status and a valid confirmed amount
- **THEN** the row labels and displays that value as redeemed and shows its confirmed outcome

#### Scenario: Redemption is pending or denied

- **WHEN** a returned redemption is pending, rejected, failed, or expired and has a valid requested amount
- **THEN** the row labels that value as requested and shows the returned non-confirmed outcome
- **AND** the row does not imply that credit was debited

#### Scenario: Redemption is reversed

- **WHEN** a returned redemption has reversed status
- **THEN** the row shows the reversed outcome and MUST NOT present the original value as a current completed debit

### Requirement: Recent redemption table states preserve the workflow boundary

The table MUST provide visible loading, empty, and unavailable states. It MUST appear only while Redeem Credit is at Find Customer, disappear when a card is verified and the workflow advances, and MUST NOT add approval, redemption, offline, or customer-authorization actions.

#### Scenario: Activity request is loading or unavailable

- **WHEN** the activity request is pending or fails
- **THEN** the table region communicates loading or temporary unavailability without exposing response bodies or sensitive request data

#### Scenario: Customer lookup advances the redemption workflow

- **WHEN** a card is successfully verified
- **THEN** the recent-redemptions table is removed as the existing redemption form is shown
- **AND** the existing verification, submission, and approval safeguards remain unchanged
