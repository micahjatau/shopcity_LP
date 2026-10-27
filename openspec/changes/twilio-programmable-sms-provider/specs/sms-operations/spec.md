## ADDED Requirements

### Requirement: Configure Twilio without exposing credentials

When Twilio is explicitly selected for real SMS mode, the system MUST validate a Twilio Account SID, API Key SID, API Key Secret, and exactly one sender source: a valid E.164 `From` number or a Twilio Messaging Service SID. It MUST keep credentials, full phone numbers, and raw Twilio errors out of logs. Existing provider defaults and credentials MUST remain untouched.

#### Scenario: Configure a Twilio trial sender

- **GIVEN** Twilio is selected with valid API-key credentials and an E.164 trial `From` number
- **WHEN** the worker creates a provider
- **THEN** it uses the configured account and API key
- **AND** no test or live request is made during configuration

#### Scenario: Configure a Twilio Messaging Service

- **GIVEN** Twilio is selected with valid API-key credentials and a Messaging Service SID
- **WHEN** the worker submits a message
- **THEN** it uses the Messaging Service as the sender source
- **AND** does not also submit a `From` number

#### Scenario: Reject missing or ambiguous sender configuration

- **GIVEN** Twilio real mode has neither sender source or has both sender sources
- **WHEN** environment validation runs
- **THEN** validation fails before the worker can send

### Requirement: Handle Twilio submission failures without unsafe retries

The system MUST map explicit HTTP 429 responses as retryable. Other HTTP errors and any transport or response-parsing failure after submission begins MUST be terminal pending provider-history verification. Error records MUST contain only normalized HTTP/error codes and safe descriptions, not raw SDK errors or request data.

#### Scenario: Rate-limited Twilio submission

- **GIVEN** Twilio explicitly rejects a request with HTTP 429
- **WHEN** the outbox worker handles the failure
- **THEN** the normal bounded retry policy may schedule a retry

#### Scenario: Ambiguous Twilio submission

- **GIVEN** Twilio returns an HTTP 5xx or the connection fails after a request begins
- **WHEN** the failure is stored
- **THEN** it is terminal until provider history is checked
- **AND** credentials, message content, and full destination are absent from diagnostics

### Requirement: Document Twilio test and delivery limitations

SMS operations documentation MUST distinguish Twilio test credentials, trial messaging, and production credentials. It MUST state that test credentials simulate supported API requests without handset delivery, while a trial Messaging API send can deliver to its verified recipient. Until authenticated status callbacks are implemented, Twilio's accepted messages remain `SENT`.

#### Scenario: Operator performs a test-credential check

- **GIVEN** Twilio test credentials are used for a supported simulated API request
- **WHEN** the API returns a simulated result
- **THEN** the operator does not treat the result as a handset delivery

#### Scenario: Trial message requires authorization

- **GIVEN** a trial send can reach a verified handset
- **WHEN** an operator considers a trial test
- **THEN** destination, exact neutral content, sender, and explicit authorization are confirmed before the request
