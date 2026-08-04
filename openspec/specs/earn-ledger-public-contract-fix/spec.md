# earn-ledger-public-contract-fix Specification

## Purpose

TBD - created by archiving change earn-ledger-public-contract-fix. Update Purpose after archive.

## Requirements

### Requirement: Single authoritative earn workflow

The system MUST expose one authoritative public earn workflow for loyalty-eligible purchases, and any legacy receipt entry point MUST either delegate to that workflow or be inaccessible to cashier-facing clients.

#### Scenario: Public earn request is handled once

- **WHEN** a cashier submits a loyalty-eligible purchase through the public API
- **THEN** the system MUST process it through the authoritative earn workflow only once
- **AND THEN** the system MUST create either a confirmed earn or a pending approval record

#### Scenario: Legacy receipt path cannot bypass the ledger

- **WHEN** a client uses a legacy receipt capture route for a loyalty-eligible purchase
- **THEN** the system MUST NOT reserve the receipt without also preserving the same earn decision path used by the authoritative workflow

### Requirement: Public earn responses reflect terminal state

The system MUST return a confirmed earn response with HTTP 201 and a pending-approval earn response with HTTP 202, and the response body MUST identify the transaction, receipt, and approval references unambiguously.

#### Scenario: Confirmed earn response

- **WHEN** the earn workflow confirms immediately
- **THEN** the system MUST return HTTP 201
- **AND THEN** the response MUST include the transaction identifier, receipt identifier, credit amount, available balance, and expiry data

#### Scenario: Pending approval response

- **WHEN** the earn workflow requires approval
- **THEN** the system MUST return HTTP 202
- **AND THEN** the response MUST include the approval identifier and the receipt identifier

### Requirement: Authoritative balance and expiry data

The system MUST calculate available loyalty balance from confirmed, unexpired credit lots and MUST expose expiry data for earned credit.

#### Scenario: Balance excludes expired credit

- **WHEN** a customer has both expired and unexpired credit lots
- **THEN** the system MUST include only unexpired remaining credit in the available balance

#### Scenario: Earned credit exposes expiry

- **WHEN** a confirmed earn is returned or retrieved
- **THEN** the system MUST expose the credit expiry timestamp derived from the earned lot

### Requirement: Ledger integrity is append-only

The system MUST preserve confirmed ledger history as append-only financial data and MUST reject invalid credit-lot amounts.

#### Scenario: Invalid amounts are rejected

- **WHEN** a ledger entry or credit lot is created with a non-positive or inconsistent amount
- **THEN** the system MUST reject the write

#### Scenario: Confirmed ledger history is immutable

- **WHEN** a confirmed ledger entry exists
- **THEN** the system MUST NOT allow it to be updated or deleted through normal application paths

### Requirement: Outbox-backed notification readiness

The system MUST persist notification intent for confirmed earns and MUST make outbox delivery status observable.

#### Scenario: Confirmed earn writes outbox intent

- **WHEN** an earn is confirmed
- **THEN** the system MUST persist an outbox event before the request completes

#### Scenario: Outbox processing updates status

- **WHEN** the outbox worker publishes or permanently fails an event
- **THEN** the system MUST record the resulting delivery status and attempts
