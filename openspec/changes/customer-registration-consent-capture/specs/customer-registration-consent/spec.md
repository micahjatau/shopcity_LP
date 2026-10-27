## ADDED Requirements

### Requirement: Registration records explicit, versioned consent

The system MUST require affirmative loyalty-service consent before customer registration and MUST separately record the optional marketing choice. It MUST store the consent choices, server-owned copy/privacy versions, server timestamp, customer, tenant, and authenticated registering actor atomically with customer and initial-card creation. Consent records MUST be append-only. The API MUST NOT accept client-supplied actor, timestamp, or version values.

#### Scenario: Authorized customer accepts required consent

- **WHEN** an authorized Supervisor or Admin submits customer/card data, required loyalty consent `true`, and a marketing choice
- **THEN** customer, initial card, and one versioned consent snapshot are committed in the same transaction
- **AND** the recorded actor, tenant, timestamp, and versions come from trusted server context

#### Scenario: Required consent is absent or declined

- **WHEN** the request omits loyalty consent or submits it as false
- **THEN** registration is rejected without creating customer, card, or consent records

#### Scenario: Marketing is optional

- **WHEN** the customer declines marketing
- **THEN** registration can succeed with marketing recorded as false
- **AND** the customer is not represented as opted in

#### Scenario: Idempotent retry

- **WHEN** the same registration is retried with the same idempotency key and same consent choices
- **THEN** the original result is returned and no second customer, card, or consent snapshot is created
- **WHEN** the same key is reused with different consent choices
- **THEN** the request conflicts and the original consent snapshot is unchanged

#### Scenario: Consent evidence is immutable

- **WHEN** an application attempts to update or delete a consent snapshot
- **THEN** the database rejects the mutation

### Requirement: Registration presents a truthful consent journey

The authorized registration UI MUST present customer information, required loyalty consent and optional marketing choice, review, and success as distinct stages. It MUST only report successful consent capture after the backend confirms registration.

#### Scenario: Consent stage

- **WHEN** the operator advances from valid customer details
- **THEN** the UI presents versioned loyalty/privacy text and a required affirmative loyalty choice
- **AND** marketing opt-in is independently optional and not preselected

#### Scenario: Review stage

- **WHEN** the operator reviews the registration
- **THEN** the page shows customer/card details and both consent choices before submission
- **AND** the operator can return to edit either preceding stage

#### Scenario: Registration succeeds

- **WHEN** the server returns the successful create response
- **THEN** the success screen confirms the customer and consent record were saved
- **AND** it does not claim unsupported virtual-card, SMS, or WhatsApp outcomes

#### Scenario: Registration fails or is uncertain

- **WHEN** the create request fails or has an uncertain response
- **THEN** the UI does not show success, retains the entered choices, and safely retries using the same logical idempotency key

### Requirement: Existing registrations remain unchanged

The consent migration MUST be additive and MUST NOT infer or backfill consent for existing customers. Existing role authorization, customer/card behavior, tenant scope, and response privacy MUST remain unchanged.

#### Scenario: Existing customer data is migrated

- **WHEN** the additive migration is applied
- **THEN** existing customers remain without a consent record unless they complete a new supported consent workflow
