## Why

The current SMS adapter is coupled to eBulkSMS, whose recent approved smoke attempts were not accepted or traceable. The ShopCity architecture requires provider switching without changing loyalty business logic, and Arkesel V2 offers a sandbox mode that allows request-path verification without billing or handset delivery.

## What Changes

- Add Arkesel V2 as an explicitly selectable provider while preserving eBulkSMS as the default and keeping the existing provider interface.
- Add a non-production-only Arkesel sandbox setting and fail closed if sandbox delivery is configured in production.
- Normalize Arkesel send IDs and delivery-report states into the existing `SENT`, `DELIVERED`, and `FAILED` contract.
- Add provider-specific configuration validation, tests, environment examples, and SMS operations guidance.
- Keep OTP separate from business-notification SMS; do not change business templates, outbox semantics, or database schema.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sms-delivery-truthfulness`: allow explicit Arkesel selection and safe non-production sandbox operation while preserving truthful delivery states.
- `sms-operations`: normalize Arkesel submission IDs and provider delivery states through existing operational reporting and DLR polling.

## Impact

- Backend: `src/jobs/sms.provider.ts`, `src/jobs/sms.provider.factory.ts`, `src/config/env.validation.ts`, and focused specs.
- Operations: `.env.example` and `docs/runbooks/sms-operations.md`.
- OpenSpec deltas for SMS provider selection and delivery-state reporting.
- No public business API, schema migration, loyalty logic, OTP, or frontend changes.
- No real SMS send; first provider call will use Arkesel sandbox only after its API key is configured.
