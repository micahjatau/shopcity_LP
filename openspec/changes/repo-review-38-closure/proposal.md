## Why

Sprint 3 is close, but the latest review shows a small set of correctness gaps still prevent closure: earn reversals do not complete, manual adjustment policy is still client-influenced, and transaction read models/audit evidence are not fully truthful. This change closes those gaps now so the repository can move past the 90% threshold with aligned runtime behavior and generated contracts.

## What Changes

- Repair successful financial reversals so eligible earn and redemption reversals complete with compensating ledger effects, audit evidence, outbox intent, and stable idempotent responses.
- Make manual credit/debit adjustment policy server-authoritative by deriving expiry from configuration and enforcing the configured amount ceiling.
- Correct transaction read models so receiptless operations do not fabricate receipt/card fields and instead expose transaction-type-specific details.
- Remove false expiry audit evidence from rejected redemption flows.
- Regenerate and validate public API artifacts so OpenAPI and generated client output match runtime behavior.
- Add the missing success, concurrency, and idempotency coverage needed to prove the above behavior end to end.

## Capabilities

### New Capabilities
- `financial-closure-hardening`: final Sprint 3 financial correctness, including reversals, manual adjustments, truthful read models, audit fidelity, and contract synchronization.

### Modified Capabilities

- 

## Impact

Affected areas include transaction reversal and adjustment services, transaction/read-model controllers, audit and outbox persistence, OpenAPI export and client generation, and the integration/unit test suites that verify closure behavior.
