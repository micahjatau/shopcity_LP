## ADDED Requirements

### Requirement: Cashier receipt activity shows both settlement effects

The cashier activity and transaction-detail read models MUST expose the redemption debit and net-paid Earn for a combined settlement under one physical receipt identity. The read models MUST preserve the existing cashier/branch scope and bounded result contract.

#### Scenario: Combined settlement appears in cashier activity

- **GIVEN** one cashier receipt has a confirmed REDEEM debit and EARN credit
- **WHEN** the cashier activity or detail is requested
- **THEN** both effects and their amounts are visible and linked to that one receipt, without duplicating the physical receipt
