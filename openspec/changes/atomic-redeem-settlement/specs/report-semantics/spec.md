## ADDED Requirements

### Requirement: Cashier receipt activity shows both settlement effects

The cashier activity and transaction-detail read models MUST expose the redemption debit and net-paid Earn for a combined settlement under one physical receipt identity. The read models MUST preserve the existing cashier/branch scope and bounded result contract.

#### Scenario: Combined settlement appears in cashier activity

- **GIVEN** one cashier receipt has a confirmed REDEEM debit and EARN credit
- **WHEN** the cashier activity or detail is requested
- **THEN** both effects and their amounts are visible and linked to that one receipt, without duplicating the physical receipt

### Requirement: Reports honor lifecycle transition order when timestamps tie

The report materializer MUST use the later lifecycle transition when two transitions have the same timestamp. A confirmed redemption whose `confirmedAt` equals `requestedAt` MUST be reported as confirmed, not pending.

#### Scenario: Immediate redemption is confirmed at request time

- **GIVEN** a redemption has `requestedAt` and `confirmedAt` set to the same instant
- **WHEN** financial and redemption summaries are materialized at or after that instant
- **THEN** the confirmed amount is included in redeemed totals and the redemption is not counted as pending approval
