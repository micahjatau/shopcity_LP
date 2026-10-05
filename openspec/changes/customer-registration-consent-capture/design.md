# Design: Customer registration consent capture

## Contract and persistence

Extend `POST /api/v1/customers` with required `loyaltyConsent: true` and required boolean `marketingOptIn`. `true` loyalty consent is mandatory to create an account; false is rejected before persistence. The server, not the browser, supplies the version constants, timestamp, tenant, and actor. Keep customer + initial card + one consent snapshot within the existing idempotent Prisma transaction. Hash consent choices with the rest of the idempotent request so replay with altered choices conflicts.

Add a `CustomerConsent` snapshot keyed by tenant/customer with loyalty acceptance, optional marketing choice, loyalty copy version, privacy notice version, captured timestamp, and registering actor. Use restrictive tenant-aware foreign keys and indexes. No API read expansion and no backfill. Consent evidence is append-only; prohibit updates/deletes at the database boundary. Idempotent retries return the original registration response and do not create a second snapshot.

Initial reference copy (versions `v1.2` for consent and `v2.0` for the privacy notice, as displayed in Landing-4): required: “The customer agrees to ShopCity holding purchase and wallet records to operate ShopCity Credit.” Optional: “Offers and campaign messages by WhatsApp or SMS.” Privacy notice `v2.0`: “Wallet data is retained for the life of the account. The customer may request export or deletion at any ShopCity branch.” These strings are provisional and require legal/product review before production release. Version strings are server-owned constants.

## UI flow

Use four stages: Customer information → Consent → Review → Success. Capture full name, phone, optional email, and required initial card serial. The consent stage requires affirmative loyalty consent and separately offers optional marketing opt-in; explain that account creation cannot proceed without required consent. The review stage shows profile/card data and the actual consent choices, labels/version, and a way to edit details/consent. Only successful HTTP 201 advances to success. Error/retry preserves choices and the existing logical idempotency key. Success says the registration and consent record were saved; do not invent virtual-card issuance or notification outcomes.

Keep role ownership at existing Supervisor/Admin pages. The API remains authoritative for authorization and validation. Consent booleans are not security or authorization inputs.

## Validation

Test DTO rejection, server-owned metadata, tenant/actor binding, atomic writes, consent-sensitive idempotency, replay, immutable record, no false success, flow navigation, required/optional choices, retries, route role regressions, generated-client alignment, and migration upgrade. Run focused unit/integration/frontend suites, OpenAPI lint/diff, Prisma validate/generate, build/typecheck, and OpenSpec validation.
