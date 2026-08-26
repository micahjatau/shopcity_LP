## ADDED Requirements

### Requirement: Approval expiry uses one shared transactional flow

The system MUST use the same expiry transaction for worker-driven and decision-driven approval expiry so related records settle atomically.

#### Scenario: Worker expires a REDEEM approval

- **WHEN** the expiry worker marks a REDEEM approval as expired
- **THEN** the approval, redemption, receipt, and expiry audit records are updated in one transaction

#### Scenario: Decision path expires an approval

- **WHEN** a decision request discovers an approval has already expired
- **THEN** the same expiry flow updates the approval, related redemption if present, receipt, and audit record atomically

### Requirement: REDEEM expiry resolves the underlying receipt

The system MUST resolve the receipt to expire from `approval.receiptId` when present or from the linked redemption receipt for REDEEM approvals.

#### Scenario: REDEEM approval has no direct receiptId

- **WHEN** a REDEEM approval is expired and the approval row has no direct receipt id
- **THEN** the system updates the receipt referenced by the linked redemption and leaves no pending approval aggregate behind
