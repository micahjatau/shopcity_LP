## Context

The current Card record is an issued-card history record: `barcodeValue` is tenant-unique, `customerId` is required, and statuses are `ACTIVE`, `BLOCKED`, or `REPLACED`. Registration requires `cardSerialNumber`; replacement requires a different `serialNumber`. Replacement retains the old row and links it to the new row. There is no physical-stock model and no Card branch relation.

The operator confirmed that a first pilot should be limited to one branch, with serials generated before physical cards are available and later printed/encoded. The exact barcode format is intentionally undecided and must remain editable. The barcode payload itself is the serial; preserve leading zeros and do not treat it as a number.

## Decisions

### Format profile and batch generation

- Keep numbering policy behind a versioned `CardSerialFormatProfile` abstraction. Profile fields should be declarative (for example, issuer prefix, sequence width, and an allowlisted check-digit algorithm), not arbitrary executable expressions or free-form regex.
- The profile version is immutable once used by a batch. Editing the structure creates a new version; existing generated/printed/issued values are never rewritten.
- Generate tenant-unique sequence values in batches and bind each batch to one branch and profile version. The branch code is stock metadata, not part of the serial, so branch transfers never require renumbering.
- Emit a print/encoding manifest whose barcode payload is exactly the generated serial string. Do not create a production batch until the v1 profile and printer/scanner behavior are confirmed.
- Preserve raw scanned/printed values and apply canonicalization only according to the selected profile. Existing uppercase/character assumptions must not be silently treated as the vendor contract.

### Branch stock lifecycle

Represent unissued stock separately from Card history. A stock item should carry tenantId, branchId, batch/profile version, serial, stable intake/order sequence, status, and auditable timestamps/actor references. Keep tenant-wide serial uniqueness across branches. A branch transfer, if later permitted, is an explicit audited stock-location change.

Proposed states:

`GENERATED -> PRINT_PENDING -> AVAILABLE -> RESERVED -> ISSUED`

with `QUARANTINED` and `VOID` terminal/safety paths. A batch becomes `AVAILABLE` only after the physical printed/encoded card is received and verified against its manifest. FIFO means ascending intake/order sequence with a stable ID tie-breaker, not lexicographic serial sorting.

A reservation timeout applies only to a card not issued to a customer. On expiry, release it only after confirming the item was not handed out and is physically present/usable; otherwise quarantine it. A `BLOCKED`, reported, or `REPLACED` issued Card serial never returns to available stock because a timer elapsed. A recovered card may be reviewed for reactivation against its original Card record, not reassigned to another customer.

### Automatic issue

- Resolve the permitted stock branch from trusted server-side context, not a client-submitted branchId. Registration uses the registration branch. The initial replacement assumption is the branch performing the replacement; confirm before implementation.
- Within the existing transaction/idempotency boundary, atomically claim the earliest AVAILABLE stock item and create the customer/card (plus existing consent, audit, and idempotency records). Database uniqueness remains the final collision guard. Concurrent requests cannot claim the same item.
- Replacement consumes a distinct AVAILABLE item, changes the old card to `REPLACED`, creates and links the new card, and preserves existing audit/outbox behavior. Never free the old serial.
- A retry with the same idempotency key returns the same serial. No stock means a clear stock-unavailable response and no partial customer/card creation.
- API responses expose the assigned serial. The UI says a serial will be assigned during review and displays the authoritative serial only after success; replacement similarly displays the new serial after success.

### Shared serial validation risk

GitNexus reports `normalizeCardSerial` as CRITICAL: 31 impacted symbols, 9 direct dependants, 1 affected process (`processRecord`), and 5 modules (Cards, Loyalty, Offline-sync, Customers, Redemptions). The existing validator and canonicalization migration encode assumptions that may not match the eventual barcode. Before changing shared validation, obtain real printer samples, define profile normalization, create an additive migration/preflight (never edit a migration applied to a shared environment), and run every affected service/process test. Do not bypass the shared helper only in the new registration path; reads/lookups must interpret the same serial consistently.

## Rollout

1. Confirm pilot branch, branch replacement policy, batch quantity, format v1, and encoding/scanner contract.
2. Add additive profile, sequence, and stock schema; preflight tenant-wide duplicates; leave all existing Card rows and values untouched.
3. Generate a small batch and deliver a reproducible print manifest. Scan/verify received physical stock before marking it AVAILABLE.
4. Enable automatic allocation only for the selected pilot branch. Keep other branches on their existing flow until inventory intake and reconciliation are proven.
5. Monitor remaining stock, failed encodes, reservations, and duplicate attempts; document rollback and migration/backup evidence.
