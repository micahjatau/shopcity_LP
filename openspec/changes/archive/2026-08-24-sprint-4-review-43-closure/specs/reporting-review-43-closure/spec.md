## ADDED Requirements

### Requirement: Redemption historical state is reconstructed only from lifecycle timestamps

The system SHALL reconstruct redemption state at a reporting watermark from `requestedAt`, `confirmedAt`, `rejectedAt`, and `reversedAt` timestamps, and SHALL NOT use mutable current `Redemption.status` as historical truth.

#### Scenario: Future rejection does not leak backward

- **GIVEN** a redemption requested on August 1 and rejected on August 10
- **WHEN** reports are materialized with `asOf` August 5
- **THEN** the redemption is represented as `PENDING_APPROVAL`, not `REJECTED`

#### Scenario: Future reversal does not remove earlier confirmed redemption totals

- **GIVEN** a redemption confirmed on August 1 and reversed on August 10
- **WHEN** reports are materialized with `asOf` August 5
- **THEN** redemption reports and daily financial/executive reports all include the same confirmed redeemed amount

### Requirement: All redemption-consuming report builders use one normalized snapshot state

The system SHALL provide a single normalized redemption state-at-watermark to every report builder so reports generated for the same `asOf` cannot disagree because one builder reads current row state.

#### Scenario: Daily financial and redemption summaries agree

- **GIVEN** a redemption whose current status differs from its state at the requested watermark
- **WHEN** redemption summary and daily financial summary rows are built for the same `asOf`
- **THEN** both summaries use the same snapshot status and produce consistent redeemed totals

### Requirement: SMS historical state uses latest lifecycle transition at the watermark

The system SHALL reconstruct SMS state by selecting the latest lifecycle transition timestamp at or before `asOf`, rather than applying fixed status priority.

#### Scenario: Later failure wins over earlier delivery

- **GIVEN** an SMS message delivered at 11:00 and failed at 12:00
- **WHEN** reports are materialized with `asOf` 12:30
- **THEN** the SMS snapshot state is `FAILED`

#### Scenario: Retry success advances state after a failure

- **GIVEN** an SMS message queued at 09:00, failed at 09:05, sent at 09:15, and delivered at 09:16
- **WHEN** the snapshot is requested at 09:10
- **THEN** the SMS snapshot state is `FAILED`
- **WHEN** the snapshot is requested at 09:20
- **THEN** the SMS snapshot state is `DELIVERED`

### Requirement: SMS retry success preserves failure evidence

The system SHALL preserve `failedAt` evidence when a later SMS retry succeeds or is suppressed so historical reports can reconstruct earlier failed watermarks.

#### Scenario: Successful retry does not erase prior failure

- **GIVEN** an SMS message has `failedAt` from a temporary provider failure
- **WHEN** a later retry returns `SENT` or `DELIVERED`
- **THEN** `failedAt` remains available for historical reporting
- **AND** current delivery fields reflect the later successful transition
