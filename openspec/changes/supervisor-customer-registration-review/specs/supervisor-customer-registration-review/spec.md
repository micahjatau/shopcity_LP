## ADDED Requirements

### Requirement: Supervisor registration confirms details before creation

The Supervisor Register customer form MUST validate locally and present a review of the intended customer and first loyalty-card details before creation. The **Review details** action MUST NOT call the create API. The review MUST show only customer full name, phone number, email or “Not provided”, and initial card serial, grouped into Customer and Initial loyalty card sections. It MUST NOT show customer/card status, linked-card state, card-task actions, or an existing-customer profile action. The review MUST offer **Edit details** and **Register customer** actions. Only the latter MAY submit the existing atomic create request, including the required loyalty consent and optional marketing choice.

#### Scenario: Review does not create a customer

- **GIVEN** all required customer/card fields and affirmative required loyalty consent are present
- **WHEN** the Supervisor chooses **Review details**
- **THEN** an accessible registration-review dialog shows the submitted values and a truthful email fallback
- **AND** the customer-create API has not been called
- **AND** the dialog contains no customer/card status or post-creation action.

#### Scenario: Edit or dismiss returns to the form

- **GIVEN** the registration-review dialog is open
- **WHEN** the Supervisor chooses **Edit details**, presses Escape, or dismisses the backdrop
- **THEN** the dialog closes and the entered form/consent values remain available
- **AND** no create request is made.

#### Scenario: Confirm submits the existing atomic registration

- **GIVEN** the reviewed details and required consent are still present
- **WHEN** the Supervisor chooses **Register customer**
- **THEN** the existing create endpoint is called once with the current customer/card/consent payload, CSRF protection, and the logical idempotency key
- **AND** the backend's atomic customer, first-card, and consent behavior is unchanged.

### Requirement: Registration conflicts identify conflicting fields

When customer registration conflicts with tenant data because a phone number, email, or card serial is already in use, the create endpoint MUST return a 409 error with a stable code and only the conflicting form field identifiers (`phone`, `email`, and/or `cardSerialNumber`). It MUST NOT return the existing customer's identity or stored values. The Supervisor registration form MUST associate each reported conflict with its corresponding input and explain what the operator can change. It MUST preserve the authoritative existing-customer recovery only for a reported phone conflict. Unrecognized 409 responses MUST retain generic recovery and MUST NOT be presented as a specific field conflict.

#### Scenario: Duplicate phone is identified safely

- **GIVEN** a submitted phone number is already registered in the tenant
- **WHEN** customer creation returns a conflict
- **THEN** the response identifies `phone` as conflicting without exposing the existing customer's data
- **AND** the registration form highlights the phone field and explains that it is already registered
- **AND** existing-customer recovery verifies any candidate by authoritative detail before offering its profile.

#### Scenario: Duplicate email and card serial are identified

- **GIVEN** a submitted email and/or initial card serial is already in use
- **WHEN** customer creation returns a conflict
- **THEN** the response identifies only the corresponding field name(s)
- **AND** the form highlights each conflicting input without displaying another customer's information.

#### Scenario: Unrecognized conflict remains generic

- **GIVEN** a 409 response is not a typed customer-registration data conflict
- **WHEN** the Supervisor sees the registration result
- **THEN** the form does not mark any input as a duplicate
- **AND** the existing generic recovery remains available.

### Requirement: Registration success follows confirmed creation

The Supervisor MUST show success only after a successful create response includes a usable customer ID. On success, the review dialog MUST close and the result MUST provide **Register another customer** and **View customer** actions; the latter MUST navigate by the confirmed stable customer ID. Failure, conflict, or uncertain outcomes MUST NOT be described as a new successful registration, and retry behavior MUST preserve the logical idempotency key when appropriate.

#### Scenario: Confirmed create succeeds

- **WHEN** confirmation receives HTTP 201 with a customer ID
- **THEN** the review dialog closes and a success card confirms the customer, first card, and consent were registered
- **AND** the success card links to `/supervisor/customers?tab=manage&id=<encoded-id>` and permits registering another customer.

#### Scenario: Create fails or is uncertain

- **WHEN** confirmation receives a conflict, non-success response, missing ID, or uncertain network outcome
- **THEN** no success state is shown
- **AND** entered values and truthful duplicate/retry recovery remain available
- **AND** a retry after an uncertain outcome reuses the same logical idempotency key.

### Requirement: Existing-customer selection loads details directly

Manage customers and Assign card MUST continue to require deliberate search-result selection or an ID deep link followed by authoritative detail loading and identity verification. Once verified, Manage customers MUST show the selected customer profile directly without a generic customer-preview modal; Assign card MUST show eligibility in its dedicated Assignment eligibility dialog, not the generic customer-preview. A mismatch or failed detail request MUST remain fail-closed. Assign card MUST retain its existing eligibility checks and separate new-serial review before the assignment write.

#### Scenario: Manage selection loads profile directly

- **GIVEN** a Supervisor explicitly selects a customer search result
- **WHEN** authoritative details return the same customer ID
- **THEN** the customer details and profile controls are shown directly
- **AND** no customer-preview dialog is opened.

#### Scenario: Assignment selection loads eligibility directly

- **GIVEN** a Supervisor explicitly selects an existing customer for card assignment
- **WHEN** authoritative details return the same customer ID
- **THEN** the dedicated Assignment eligibility dialog shows the verified customer and eligibility state
- **AND** the assignment still requires its existing new-serial review before creating a card
- **AND** no generic customer-preview dialog is opened.

#### Scenario: Mismatched details fail closed

- **WHEN** a detail response does not match the selected/deep-linked customer ID or cannot be loaded
- **THEN** the appropriate truthful detail error is shown
- **AND** neither profile writes nor card assignment is enabled from unverified data.
