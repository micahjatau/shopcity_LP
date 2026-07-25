## ADDED Requirements

### Requirement: eBulkSMS provider contract
The system SHALL send production SMS messages through a provider-specific eBulkSMS adapter that converts ShopCity SMS inputs into the eBulkSMS JSON request contract.

#### Scenario: Sending a receipt notification
- **WHEN** a production SMS is sent for an outbox event with a receipt ID, E.164 phone number, template, and payload
- **THEN** the adapter MUST POST to the configured eBulkSMS sendsms JSON endpoint with body credentials, sender ID, rendered message text, recipient GSM data, and the outbox event ID as the provider correlation identifier where supported

#### Scenario: Internal payload is not leaked to vendor
- **WHEN** the adapter sends a message to eBulkSMS
- **THEN** the request body MUST NOT be the raw `SmsSendInput` object or include unrendered internal template payload as the vendor message body

### Requirement: eBulkSMS response classification
The system SHALL map eBulkSMS response statuses into the existing ShopCity SMS result contract with explicit retryable and terminal failure categories.

#### Scenario: Vendor accepts message
- **WHEN** eBulkSMS returns a successful response status
- **THEN** the adapter MUST return a sent ShopCity result with the provider message identifier when available

#### Scenario: Vendor rejects credentials or recipient
- **WHEN** eBulkSMS returns authentication, invalid-recipient, malformed-request, or other non-retryable client failure statuses
- **THEN** the adapter MUST return a failed ShopCity result with `failureCategory` set to `terminal`

#### Scenario: Vendor has transient failure
- **WHEN** eBulkSMS returns a rate-limit, timeout, server error, or network failure
- **THEN** the adapter MUST return a failed ShopCity result with `failureCategory` set to `retryable`

#### Scenario: Vendor response shape is invalid
- **WHEN** eBulkSMS returns a response that does not match the expected status and identifier schema
- **THEN** the adapter MUST return a terminal failed result and MUST NOT report the message as sent

### Requirement: Production SMS provider safety
The system SHALL reject fake SMS providers in production unless a clearly named emergency override is deliberately enabled.

#### Scenario: Deterministic mode in production
- **WHEN** `NODE_ENV` is `production` and `SMS_PROVIDER_MODE` is `deterministic`
- **THEN** provider creation MUST fail unless the fake-provider production override is explicitly enabled

#### Scenario: Sandbox mode in production
- **WHEN** `NODE_ENV` is `production` and `SMS_PROVIDER_MODE` is `sandbox`
- **THEN** provider creation MUST fail unless the fake-provider production override is explicitly enabled

#### Scenario: Real mode in production
- **WHEN** `NODE_ENV` is `production` and `SMS_PROVIDER_MODE` is `real` with complete eBulkSMS credentials
- **THEN** provider creation MUST return the eBulkSMS provider

### Requirement: SMS timeout and payload validation
The system SHALL enforce SMS provider timeouts across both response headers and response-body parsing, and SHALL validate outbound/reconstructed SMS payloads before attempting delivery.

#### Scenario: Provider stalls response body
- **WHEN** an SMS provider returns headers but does not complete the response body before `SMS_PROVIDER_TIMEOUT_MS`
- **THEN** the send attempt MUST fail as retryable timeout and MUST NOT hang beyond the configured timeout

#### Scenario: Reconstructed SMS lacks receipt ID
- **WHEN** outbox recovery reconstructs an SMS send payload without a receipt ID
- **THEN** the worker MUST dead-letter the event as invalid payload instead of substituting another identifier

### Requirement: Worker recovery shutdown safety
The system SHALL track the initial outbox recovery cycle as active work so shutdown waits for recovery before closing shared resources.

#### Scenario: Shutdown during initial recovery
- **WHEN** the worker receives a stop signal while the initial recovery cycle is running
- **THEN** shutdown MUST wait for that recovery cycle before closing BullMQ, Prisma, or related worker resources
