# sms-delivery-closeout Specification

## ADDED Requirements

### Requirement: SMS payload serialization preserves zero balances
The system MUST serialize `remainingBalanceKobo` when it is zero and MUST omit it only when the value is undefined.

#### Scenario: Remaining balance is zero
- **WHEN** an SMS payload is built with `remainingBalanceKobo = 0n`
- **THEN** the serialized payload includes the field with value `"0"`

#### Scenario: Remaining balance is absent
- **WHEN** an SMS payload is built without `remainingBalanceKobo`
- **THEN** the serialized payload omits the field

### Requirement: Adjustment messages are directionally truthful
The system MUST render adjustment-related SMS messages with an explicit direction or kind.

#### Scenario: Credit adjustment is rendered
- **WHEN** the message describes a positive adjustment
- **THEN** the text states that the balance was increased

#### Scenario: Debit adjustment is rendered
- **WHEN** the message describes a negative adjustment
- **THEN** the text states that the balance was reduced

### Requirement: Real-provider smoke evidence is recorded safely
The system MUST provide a controlled smoke test path that uses an approved test destination and writes redacted evidence.

#### Scenario: Smoke test runs in approved mode
- **WHEN** the controlled smoke script runs with the required approval inputs
- **THEN** it sends one message, records provider identity, and writes a redacted JSON evidence report

### Requirement: SMS operational guidance covers credential rotation
The system MUST document SMS credential rotation, sender-ID rotation, restart order, duplicate-send avoidance, retry classification, outage handling, and verification.

#### Scenario: Operator follows the runbook
- **WHEN** an operator performs a credential rotation
- **THEN** the runbook describes the deployment and verification steps needed to avoid duplicate sends
