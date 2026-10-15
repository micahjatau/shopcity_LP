## 1. Configuration and Provider Selection

- [x] 1.1 Add validated vendor selection and Arkesel settings with an eBulkSMS-compatible default; verify `npx jest src/config/env.validation.spec.ts --runInBand`.
- [x] 1.2 Extend provider creation to select Arkesel, preserve existing eBulkSMS and fake-provider paths, and reject Arkesel sandbox in production; verify factory contract tests in `src/jobs/sms.provider.spec.ts`.

## 2. Arkesel Adapter

- [x] 2.1 Use the documented nested recipients array in Arkesel V2 send requests while preserving API-key authentication, transactional use case, sandbox flag, timeout, and stable outbox correlation; verify request-contract unit tests.
- [x] 2.2 Implement Arkesel response-ID extraction and DLR status normalization with fail-closed handling for missing, unknown, or mismatched evidence; verify DLR unit tests.

## 3. Documentation and Verification

- [x] 3.1 Add safe Arkesel configuration and sandbox guidance to `.env.example` and the SMS operations runbook; verify documentation matches validated configuration names and default behavior.
- [x] 3.2 Run focused provider/config tests, relevant SMS worker tests, formatting, OpenSpec strict validation, and `git diff --check`; report results and confirm the follow-up request used sandbox mode only.
