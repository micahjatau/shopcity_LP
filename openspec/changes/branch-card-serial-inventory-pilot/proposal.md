## Why

Customer registration and card replacement currently depend on a staff member entering a serial manually. ShopCity has no modeled branch card stock, and the actual printed serial format has not yet been approved. A one-branch pilot should generate serial batches for printing/encoding, then assign only physically verified stock automatically.

## What Changes

- Add a versioned, editable serial-format profile so the eventual printed barcode convention is configuration, not scattered assumptions in code.
- Generate serials in batches for a single pilot branch and produce a print/encoding manifest containing the exact barcode payloads.
- Track each generated physical serial through print/receipt, availability, reservation, issuance, quarantine, and retirement.
- Allocate the next available serial from the authorized branch during registration, existing-customer card assignment, and replacement; no customer-facing workflow asks staff to type a serial.
- Preserve replaced, reported, and blocked card history. Only an expired reservation for an unissued stock item may return to available stock, subject to physical verification.

## Capabilities

### New Capabilities

- `branch-card-serial-inventory`: Defines editable serial-format profiles, branch-owned stock batches, and automatic assignment for the one-branch pilot.

### Modified Capabilities

- Customer registration and card replacement use branch inventory allocation instead of accepting manually entered serial numbers.

## Impact

- Prisma card-stock/profile models and additive migration; existing issued Card rows and serials remain unchanged.
- `CustomersService.createCustomer`, `CardsService.createCard`/`replaceCard`, card serial validation, DTO/OpenAPI/client contracts, and the relevant Supervisor UI.
- Migration tracker, service/UI tests, and a controlled one-branch rollout.
- `normalizeCardSerial` has exact CRITICAL GitNexus impact (31 symbols across Cards, Loyalty, Offline-sync, Customers, and Redemptions). Any shared validation change must be explicitly reviewed and regression-tested before implementation; do not relax it as a pilot-only shortcut.

## Pilot Inputs Still Required

- Select the actual pilot branch and initial batch quantity.
- Approve a concrete version-1 format after confirming the printer/encoder and barcode scanner contract. Until then, generation must be gated and no production serial batch may be created.
- Confirm the branch used for replacements performed away from a customer's home branch; the initial proposal assumes the servicing branch's stock.
