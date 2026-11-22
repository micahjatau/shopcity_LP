# Consolidated fraud evaluation

## ADDED Requirements

### Requirement: One fraud evaluation boundary

The system MUST route asynchronous receipt, redemption, duplicate-attempt, and reversal fraud evaluation through one authoritative service. It MUST use tenant and branch identity from persisted records or validated event context and MUST use branch `PolicyConfiguration` thresholds when present.

#### Scenario: Branch policy is configured

- **WHEN** a purchase or redemption fraud event is evaluated
- **THEN** the corresponding branch policy determines flag/approval thresholds, with existing bootstrap defaults used only where a policy is absent

### Requirement: Non-overlapping purchase findings

A high-value purchase MUST produce no more than one high-value fraud finding per logical receipt. A purchase over the approval threshold MUST be represented by one high-severity finding; a purchase over only the flag threshold MUST be represented by one medium-severity finding.

#### Scenario: Purchase exceeds approval threshold

- **WHEN** a receipt exceeds both configured purchase flag and approval thresholds
- **THEN** the evaluator creates one high-severity purchase case, not separate medium and high cases

#### Scenario: Purchase exceeds only flag threshold

- **WHEN** a receipt exceeds the configured flag threshold but not the approval threshold
- **THEN** the evaluator creates one medium-severity purchase case

### Requirement: Initial live rule set

New fraud evaluation MUST be limited to duplicate receipt attempts, configured high-value purchase review/approval, configured high-value redemption approval, and unusually frequent reversals. It MUST NOT newly emit cashier peer-comparison, rounded-value, card-frequency, card-replacement-frequency, or authentication-failure fraud findings. Login rate limiting remains an independent security control.

#### Scenario: Deferred rules receive new events

- **WHEN** a receipt, card replacement, auth failure, or reversal event is evaluated
- **THEN** only the configured reversal-frequency rule may produce a finding from that set; deferred rule families produce none

### Requirement: Preserve historical fraud and synchronous transaction controls

The system MUST preserve existing fraud flags, audit history, balances, duplicate-receipt prevention, wallet checks, and approval decisions. New fraud policy MUST NOT change transaction authorization or rewrite historical records.

#### Scenario: Existing transaction controls

- **WHEN** purchases or redemptions are submitted after the evaluator change
- **THEN** the existing synchronous duplicate, balance, and approval validations retain their current behavior
