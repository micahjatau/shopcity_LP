# Customer registration consent capture

## Why

Landing references 3–6 show a four-stage registration journey: customer details, consent, review, and success. The current API does not persist consent, so the UI must not claim that consent was recorded. The operator approved amending the requirements and API/data model before implementing this flow.

## Scope

- Add a tenant-scoped, append-only consent snapshot created atomically with customer and initial card.
- Require loyalty-service consent; capture optional marketing opt-in separately.
- Persist the consent text/version and privacy notice version, server timestamp, and authenticated registering actor; never trust client-supplied actor/time/version.
- Add optional email to profile entry and retain existing required initial card contract.
- Regenerate OpenAPI and TypeScript client, then implement details → consent → review → success for authorized Supervisor/Admin routes.
- Do not backfill existing customers, alter RBAC, provide consent withdrawal tooling, or change existing customer data.

## Risks and mitigations

- Consent wording/purpose requires product/legal confirmation before release. The initial strings are explicit versioned product copy from the supplied reference and must be treated as provisional until reviewed.
- Consent is personal data: restrict access to existing registration mutation; expose no new read surface; preserve tenant isolation.
- Atomic customer/card/consent creation and idempotent replay avoid partial registrations or duplicate consent snapshots.
- Append-only records preserve evidence; future corrections/withdrawals require a separate event-based contract.

## Rollback

Forward-fix/expand-and-contract only. The additive table can remain unused if application rollback is needed. Do not delete consent records or rewrite an applied migration.
