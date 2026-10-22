## ADDED Requirements

### Requirement: Customer can withdraw optional marketing consent at a store

The system MUST allow authorized store staff to record a customer's in-person request to stop optional direct-marketing messages. The withdrawal MUST take effect immediately in ShopCity's effective marketing preference. It MUST NOT delete/deactivate the customer account, mutate the original consent snapshot, alter purchase/wallet/ledger history, or suppress transactional/service messages. The flow MUST clearly distinguish marketing withdrawal from account/data deletion and MUST NOT claim removal from an external campaign list unless that integration confirms it.

#### Scenario: Staff records an in-person withdrawal

- **WHEN** an authenticated cashier or other authorized branch staff member selects an existing tenant customer, confirms the customer requested the change in person, and submits with an idempotency key
- **THEN** the system appends an `OPTED_OUT` marketing-preference event with source `IN_STORE`, the authenticated actor, assigned branch, tenant/customer, and server timestamp
- **AND** the current effective marketing preference becomes opted out immediately
- **AND** the original registration consent record remains unchanged
- **AND** an audit event is committed atomically with the preference event
- **AND** the customer account, cards, purchase/wallet/ledger history, and transactional/service-message eligibility remain unchanged

#### Scenario: Idempotent retry

- **WHEN** the same staff actor retries the same customer withdrawal with the same idempotency key and payload within the idempotency retention window
- **THEN** the original successful result is returned without adding a second preference event or audit entry
- **WHEN** the same key is reused for a different customer or payload within the idempotency retention window
- **THEN** the request conflicts and no second event is written

#### Scenario: Tenant and branch isolation

- **WHEN** staff submits a withdrawal for a customer outside their tenant, with no active assigned branch, or with an invalid branch association
- **THEN** the request is rejected and no preference event or audit success is written
- **AND** the browser cannot supply or override the actor, tenant, branch, or event timestamp

#### Scenario: Current preference is shown separately from registration evidence

- **WHEN** authorized staff view the customer's consent information after a withdrawal
- **THEN** the UI shows the original marketing choice at registration and the current effective preference as separate facts
- **AND** it shows the withdrawal time when available without exposing internal event identifiers
- **WHEN** the preference read fails
- **THEN** the current preference is shown as unavailable rather than opted in

#### Scenario: Transactional messages continue

- **WHEN** a customer withdraws from optional marketing
- **THEN** marketing preference changes to opted out
- **AND** the flow does not suppress transactional/service messages or modify unrelated notification preferences

#### Scenario: Customer is informed of scope

- **WHEN** staff opens or confirms the in-store withdrawal action
- **THEN** the UI says that the request stops optional marketing only, does not close the account or delete purchase/wallet history, and does not stop transactional/service messages
- **AND** the UI does not claim that an external list was automatically updated
- **AND** the UI instructs staff to update any separate marketing list manually after recording the request

#### Scenario: Preference evidence is immutable

- **WHEN** an application attempts to update or delete a marketing-preference event
- **THEN** the database rejects the mutation

### Requirement: Marketing senders respect effective preference

Any ShopCity system that sends direct marketing MUST resolve the effective marketing preference before sending and MUST fail closed when the preference cannot be determined. Transactional/service-message paths MUST remain independent of this marketing preference.

#### Scenario: Marketing message is attempted after withdrawal

- **WHEN** a direct-marketing sender evaluates a customer whose effective preference is opted out
- **THEN** it does not enqueue or send the marketing message

#### Scenario: Preference cannot be resolved

- **WHEN** a direct-marketing sender cannot read the customer's effective preference
- **THEN** it does not enqueue or send the marketing message
