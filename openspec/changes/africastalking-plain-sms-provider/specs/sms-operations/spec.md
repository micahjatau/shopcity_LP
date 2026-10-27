## ADDED Requirements

### Requirement: Send ShopCity-rendered SMS through Africa's Talking

The system MUST send each rendered business notification to the Africa's Talking standard SMS endpoint as a form-encoded request containing the configured username, one E.164 recipient, complete rendered message, and, for live sends, the explicit registered sender ID. It MUST authenticate with the `apiKey` header and keep credentials, full recipients, and message bodies out of logs. It MUST NOT send an undocumented `requestId` field to the standard endpoint. Ambiguous HTTP 5xx or transport failures MUST be terminal until provider history is checked; only an explicit HTTP 429 response may be retried automatically.

#### Scenario: Submit a plain-text notification

- **WHEN** an Africa's Talking provider is selected and the request is accepted
- **THEN** the system submits one fully rendered recipient message to `/version1/messaging`
- **AND** records only provider acceptance and the matching provider message ID

#### Scenario: Use Africa's Talking sandbox

- **GIVEN** the provider is explicitly configured for non-production sandbox use with its separate sandbox API key
- **WHEN** the system submits a notification
- **THEN** it uses the Africa's Talking sandbox endpoint and sandbox username
- **AND** it does not treat simulator acceptance as handset delivery

#### Scenario: No delivery-report callback is configured

- **GIVEN** Africa's Talking reports an accepted send but delivery-report callback ingestion is not configured
- **WHEN** the notification is inspected
- **THEN** its state remains `SENT`
- **AND** the system does not poll an unsupported delivery-status endpoint or mark it `DELIVERED`
