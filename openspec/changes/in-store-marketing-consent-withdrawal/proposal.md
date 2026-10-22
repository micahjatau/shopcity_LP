## Why

Customers need a simple way to withdraw optional ShopCity direct-marketing consent when they visit a store. The current registration consent snapshot is immutable and there is no withdrawal workflow. Staff must not edit/delete the original evidence or interpret a marketing opt-out as account deletion.

## What Changes

- Add an authenticated in-store staff action that records the customer's request to stop optional direct marketing.
- Store each withdrawal as tenant/customer/branch/actor-scoped append-only evidence with a server timestamp and idempotent retry behavior.
- Derive and expose the current marketing preference from the immutable registration snapshot plus later preference events; withdrawal takes effect immediately.
- Add a cashier customer-profile confirmation flow that clearly explains the request stops marketing only, does not close the account or remove purchase/wallet history, and does not suppress service/transactional messages.
- Keep a dedicated marketing preference status visible to authorized staff without exposing event IDs or unnecessary PII.

## Capabilities

### New Requirements

- `in-store-marketing-consent-withdrawal`: store-assisted, auditable withdrawal of optional direct-marketing consent, with tenant/branch/actor controls and append-only evidence.

## Impact

- `prisma/schema.prisma` and a new additive migration for append-only marketing-preference events.
- `src/modules/customers/customers.service.ts`, `customers.controller.ts`, focused service/controller tests, and generated OpenAPI/client contract.
- Cashier customer-profile action UI and focused tests; authorized customer profile projection may show current marketing preference.
- `docs/database/migration-tracker.md` and this change's migration evidence.
- No customer/account deletion, purchase/wallet/ledger mutation, required loyalty-consent change, or transactional SMS behavior change.

The repo contains no marketing campaign delivery path. This flow records authoritative suppression in ShopCity; any external campaign system must consume that preference before sending. It cannot claim to remove a customer from an unintegrated external list.
