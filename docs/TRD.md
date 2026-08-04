ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

# **ShopCity Loyalty Platform Backend Technical Architecture, API and Engineering Standards Document**

Prepared by Radar Solutions for ShopCity

Version 1.0 | July 19, 2026 | Confidential

| **Document Field**  | **Value**                                                                 |
| ------------------- | ------------------------------------------------------------------------- |
| Client              | ShopCity                                                                  |
| Developer           | Radar Solutions                                                           |
| Document Type       | Backend Technical Architecture and Requirements<br>Document               |
| Supersedes          | ShopCity Loyalty Platform TRD Version 0.1                                 |
| Commercial Pricing  | Excluded                                                                  |
| Delivery Model      | Backend-first, API-contract-first; frontend developed in<br>parallel      |
| System Type         | Browser-based loyalty store-credit layer beside existing<br>POS           |
| Primary Users       | Cashiers, Supervisors, Admin/Owner, System Operators                      |
| Operational Setting | One branch; multiple tills; two cashiers and two supervisors<br>per shift |
| Confidentiality     | Radar Solutions and authorized ShopCity stakeholders only                 |

#### **Confidentiality Notice**

This document defines the implementation baseline for the ShopCity loyalty MVP. It is an internal engineering and client-alignment artifact. It does not constitute a commercial quotation or contractual warranty.

Radar Solutions | Confidential | Page 1

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

## **Document Control**

| **Version** | **Date**      | **Author**      | **Change Summary**                                                                                                                                                                                 |
| ----------- | ------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1         | July 6, 2026  | Radar Solutions | Initial technical requirements<br>based on discovery.                                                                                                                                              |
| 1.0         | July 19, 2026 | Radar Solutions | Backend-first revision: clean<br>architecture, complete<br>toolchain, API conventions<br>and catalogue, data model,<br>expiry-aware ledger, testing,<br>documentation, CI/CD and<br>delivery plan. |

### **Review and Approval**

| **Role**                          | **Name**        | **Decision** | **Date** |
| --------------------------------- | --------------- | ------------ | -------- |
| ShopCity<br>Owner/Representative  | To be completed | Pending      |          |
| Radar Solutions Technical<br>Lead | To be completed | Pending      |          |
| Frontend Lead                     | To be completed | Pending      |          |
| QA/Reviewer                       | To be completed | Pending      |          |

## **Table of Contents**

1. Executive Summary

2. Purpose, Audience and Delivery Model

3. Product Context, Constraints and Scope

4. Business Rules and Non-Negotiable Invariants

5. Target Architecture

6. Engineering Toolchain and Development Standards

7. Repository Structure and Clean Architecture Rules

8. Domain Model and Data Architecture

9. Backend Modules and Responsibilities

10. API Design Standards

11. API Endpoint Catalogue

12. Critical API Contracts

13. Workflow and Sequence Specifications

14. Authentication, Authorization and Session Security

15. Application Security and Data Protection

16. Fraud, Abuse Prevention and Approvals

17. Offline Synchronization

18. SMS and Background Processing

19. Reporting and Analytics

20. Observability, Reliability and Operations

21. Testing and Quality Assurance

22. CI/CD, Release Management and Environments

23. Documentation Standards

24. Backend Implementation Plan

25. Definition of Done and MVP Acceptance Criteria

26. Risks, Mitigations and Open Decisions Appendices

Radar Solutions | Confidential | Page 2

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

## **1. Executive Summary**

The ShopCity Loyalty Platform is a controlled store-credit ledger that operates beside the existing POS. The POS does not expose an API, webhook, database, or export feed; therefore, the loyalty backend must establish its own authoritative audit trail while acknowledging that purchase values are entered manually by authenticated cashiers.

This revision is intentionally backend-first. The UI/UX and frontend team can work in parallel against a versioned OpenAPI contract, generated TypeScript client, mock server, and deterministic error catalogue. The backend owns financial calculations, authorization, receipt uniqueness, ledger integrity, approvals, expiry, fraud flags, asynchronous SMS processing, and reporting definitions.

#### **Architecture Decision**

Implement a modular monolith, not microservices. ShopCity volume is modest; correctness and auditability matter far more than distributed complexity. Module boundaries will be enforced in code so that services can be separated later without a rewrite.

### **1.1 Backend Outcome**

- A production-ready NestJS API and worker process with strict TypeScript, PostgreSQL, Redis/BullMQ, OpenAPI documentation and automated quality gates.

- An append-only, expiry-aware store-credit ledger whose balance can be reconstructed and reconciled.

- A stable integration contract that allows frontend work to proceed before all backend modules are complete.

- Automated tests for business rules, database constraints, RBAC, idempotency, offline sync and critical checkout journeys.

- Operational documentation covering deployment, rollback, incident response, backups, SMS failures and cashier misuse.

### **1.2 What the Backend Must Never Do**

- Trust a frontend-submitted credit amount, balance, role or approval decision.

- Use floating-point numbers for monetary calculations.

- Edit or delete confirmed financial ledger history.

- Confirm an offline earning transaction before the central server accepts it.

- Allow stale cached balances to authorize redemptions.

- Hide errors behind generic success responses or untraceable logs.

## **2. Purpose, Audience and Delivery Model**

This document is the implementation baseline for backend engineers, frontend engineers, QA, DevOps and reviewers. It translates ShopCity business rules into architecture, APIs, data constraints, coding standards and release controls.

### **2.1 Delivery Responsibilities**

| **Area**            | **Backend/Radar Solutions**             | **Frontend/UI Team**                         | **Shared Contract**                        |
| ------------------- | --------------------------------------- | -------------------------------------------- | ------------------------------------------ |
| Business rules      | Authoritative enforcement               | Display and user guidance                    | OpenAPI schemas and<br>acceptance criteria |
| Authentication      | Session issuance, expiry, RBAC          | Login/logout screens and<br>session handling | Cookie/CSRF contract                       |
| Loyalty calculation | Server-only                             | Preview only                                 | Response fields and error codes            |
| Offline mode        | Sync API and validation                 | IndexedDB queue and status<br>UX             | Offline batch schema                       |
| API documentation   | Generate and publish                    | Consume generated client                     | Versioned OpenAPI artifact                 |
| Testing             | Unit, integration, contract, API<br>E2E | Component and browser E2E                    | Shared staging smoke tests                 |

### **2.2 API-First Parallel Workflow**

1. Backend publishes an initial OpenAPI contract and example payloads before endpoint completion.

2. Prism serves a mock API from the contract so frontend development is not blocked.

3. Orval generates the typed TypeScript client and React Query hooks for the frontend repository.

4. Every pull request runs Spectral linting and oasdiff to detect invalid or breaking API changes.

Radar Solutions | Confidential | Page 3

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

5. Completed backend endpoints replace mocks progressively without changing approved contracts.

## **3. Product Context, Constraints and Scope**

### **3.1 Confirmed Operational Context**

| **Fact**          | **Confirmed Requirement / Implication**                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| POS integration   | No API, webhook, database access or daily export. Loyalty<br>platform maintains a separate ledger.                                             |
| Receipt data      | Receipt number, date/time and total are available; no item list,<br>cashier ID, payment method or clear discount line.                         |
| Receipt sequence  | Receipt number resets weekly and is unique across tills within<br>the week.                                                                    |
| Checkout devices  | Existing browser-enabled POS computers with USB barcode<br>scanners.                                                                           |
| Staffing          | Two cashiers and two supervisors per shift; supervisors register<br>customers at customer service desk.                                        |
| Volume assumption | About 100 daily transactions; approximately 30% loyalty<br>adoption; average basket about NGN 10,000; normal high<br>basket up to NGN 200,000. |
| Rewards           | 2% of final paid amount; store-funded; staff purchases<br>excluded; wholesale purchases eligible.                                              |
| Expiry            | Unused earned credit expires 12 months after earning.                                                                                          |
| Messaging         | SMS for MVP; store pays provider costs.                                                                                                        |
| Offline           | Offline earning can be queued as pending; offline redemption is<br>prohibited.                                                                 |

### **3.2 In Scope**

- User authentication, roles, device attribution and session management.

- Customer registration, phone normalization, card assignment, replacement and blocking.

- Card lookup, earn, redeem, reversal, manual adjustment, approvals and expiry.

- Weekly duplicate receipt prevention and idempotent state-changing APIs.

- SMS outbox, background jobs, retries and provider delivery tracking.

- Suspicious activity rules, audit logs, owner reports and operational health endpoints.

- OpenAPI documentation, generated frontend client, automated tests and CI/CD.

### **3.3 Out of Scope for MVP**

- Direct POS integration, item-level exclusions, receipt OCR and automated sales reconciliation.

- Customer self-service portal, digital card, WhatsApp, multi-branch UI and supplier-funded promotions.

- Cash withdrawal or transfer of store credit outside ShopCity.

- Offline redemption or decentralized balances on cashier devices.

## **4. Business Rules and Non-Negotiable Invariants**

| **ID** | **Rule**                                                    | **Backend Enforcement**                                                                 |
| ------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| BR-001 | Earn 2% of final paid amount.                               | credit_kobo = ceil(purchase_amount_kobo<br>x 2 / 100). Ignore client-calculated credit. |
| BR-002 | Money is stored as integer kobo.                            | Use BIGINT/decimal-safe arithmetic; never<br>IEEE floating point.                       |
| BR-003 | One active customer account per<br>normalized phone number. | Partial unique index on tenant + phone<br>where status is active.                       |
| BR-004 | Staff purchases do not earn.                                | Customer is_staff is checked inside the<br>earn transaction.                            |
| BR-005 | Receipt number is unique per branch and<br>receipt week.    | Database unique constraint; application pre-<br>check is advisory.                      |

Radar Solutions | Confidential | Page 4

<!-- Start of picture text -->

PostgreSQL<br>Ledger + constraints + audit<br>Auth | CustomersModular Monolith| Cards | Loyalty ___ Redis + BullMQ SMS Provider<br>Approvals | Fraud | Reports | Audit SMS, expiry, reports, retnies<br>PESCashier/ Supervisor Browser PWA HTTPS / JSON eae ae ~.<br> EE EET CuO fapiv1 TTT TT atte ea ee eee - e e L LLLL igl f Pino +OpentTelemetry-readySentry + Health Checks<br><!-- End of picture text -->

<!-- Start of picture text -->

HTTP Controllers / DTOs<br>Application Use Cases | | __ .<br>Repositories / Prisma / Providers : : - ‘. = , Customers & Cards es<br>‘implements ports ' f : - '<br>\ 4 ’ . . . .<br>Domain Rules / Policies 5 ( swe ) ‘ Loyalty Ledger e<br><!-- End of picture text -->

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

| **Concern**       | **Selected Tool**                   | **Status**                      | **Reason**                                                                    |
| ----------------- | ----------------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
|                   |                                     |                                 | indexes and concurrency.                                                      |
| ORM/migrations    | Prisma                              | Required                        | Typed queries, controlled<br>migrations, schema review and<br>seed tooling.   |
| Queue/cache       | Redis + BullMQ                      | Required                        | Reliable retries, delayed expiry<br>jobs, SMS queue and distributed<br>locks. |
| API specification | OpenAPI via @nestjs/swagger         | Required                        | Machine-readable contract for<br>frontend, docs and testing.                  |
| Validation        | class-validator + class-transformer | Required                        | Server-side DTO validation<br>integrated with NestJS.                         |
| Logging           | Pino via nestjs-pino                | Required                        | Structured, low-overhead JSON<br>logs with request correlation.               |
| Error tracking    | Sentry                              | Required for staging/production | Release-linked exceptions and<br>alerting.                                    |
| Health checks     | @nestjs/terminus                    | Required                        | Liveness/readiness for API, DB<br>and Redis.                                  |
| Containers        | Docker + Docker Compose             | Required                        | Reproducible local and<br>deployment environment.                             |

### **6.2 Clean Code and Repository Quality Tools**

| **Tool**                                           | **Purpose**                                                  | **Required Gate**                                  |
| -------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| ESLint + typescript-eslint                         | Correctness, unsafe patterns, unused code<br>and consistency | No errors on pull requests                         |
| Prettier                                           | Deterministic formatting                                     | Formatting check on pull requests                  |
| eslint-plugin-boundaries or dependency-<br>cruiser | Prevent forbidden imports and enforce<br>module boundaries   | Architecture check on pull requests                |
| Husky + lint-staged                                | Fast local checks on staged files                            | Developer convenience; CI remains<br>authoritative |
| Commitlint + Conventional Commits                  | Readable history and automated releases                      | Commit/PR title check                              |
| SonarQube/SonarCloud                               | Maintainability, duplication and code smells                 | Recommended after pilot                            |
| Renovate                                           | Automated dependency update PRs                              | Required after repository stabilization            |
| Knip                                               | Detect unused files, exports and<br>dependencies             | Scheduled or pre-release check                     |

### **6.3 API and Documentation Tooling**

| **Tool**          | **Use**                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| @nestjs/swagger   | Generate OpenAPI contract from approved DTOs and endpoint<br>metadata.         |
| Spectral          | Lint OpenAPI naming, descriptions, error schemas and security<br>definitions.  |
| Redoc             | Publish readable API reference for frontend and QA.                            |
| Prism             | Run a mock API from OpenAPI while backend endpoints are under<br>construction. |
| Orval             | Generate typed TypeScript client and TanStack Query hooks for<br>frontend.     |
| oasdiff           | Detect breaking API changes in pull requests.                                  |
| Bruno + Bruno CLI | Version-controlled API requests, environments and smoke tests.                 |
| Compodoc          | Generate module/service dependency documentation for NestJS.                   |
| Mermaid/Graphviz  | Store architecture, ERD and sequence diagrams as code.                         |

Radar Solutions | Confidential | Page 7

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

| **Tool**         | **Use**                                                              |
| ---------------- | -------------------------------------------------------------------- |
| ADRs in Markdown | Record consequential decisions, alternatives and rationale.          |
| TypeDoc          | Document shared TypeScript packages where public APIs require<br>it. |

### **6.4 Testing and Security Tooling**

| **Tool**                               | **Use**                                                  | **Stage**            |
| -------------------------------------- | -------------------------------------------------------- | -------------------- |
| Jest                                   | Unit and application service tests                       | Every PR             |
| Supertest                              | HTTP integration and authorization tests                 | Every PR             |
| Testcontainers                         | Real PostgreSQL and Redis integration<br>tests           | CI integration suite |
| Schemathesis or OpenAPI contract tests | Exercise generated API schema against<br>running service | Staging/CI           |
| Playwright                             | Cross-system critical journey tests with<br>frontend     | Staging              |
| k6                                     | Load and latency tests for checkout and<br>reporting     | Pre-release          |
| CodeQL                                 | Static security analysis                                 | Every PR / scheduled |
| Trivy                                  | Container and dependency vulnerability<br>scanning       | Build pipeline       |
| OWASP ZAP baseline                     | Dynamic security smoke test                              | Staging              |
| Gitleaks                               | Prevent secrets entering Git history                     | Every PR             |

### **6.5 Tools Deliberately Deferred**

| **Tool/Pattern**                               | **Decision**                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Microservices and message broker such as Kafka | Deferred; unjustified complexity for MVP volume.                                     |
| Kubernetes                                     | Deferred; use managed platform or simple containers.                                 |
| Event sourcing framework                       | Not required. The append-only financial ledger provides the needed<br>audit history. |
| GraphQL                                        | Not required. Versioned REST/OpenAPI is a better checkout<br>integration boundary.   |
| Full Prometheus/Grafana stack                  | Optional after pilot; begin with health checks, Pino and Sentry.                     |
| Receipt OCR/AI                                 | Out of scope until reliable receipt samples and fraud workflow exist.                |

## **7. Repository Structure and Clean Architecture Rules**

### **7.1 Recommended Workspace**

```
shopcity-loyalty-backend/
  apps/
    api/                  # NestJS HTTP application
    worker/               # BullMQ processors and scheduled jobs
  packages/
    contracts/            # shared API enums/types generated from OpenAPI
    config/               # validated environment configuration
    testing/              # factories, fixtures, test helpers
  prisma/
    schema.prisma
    migrations/
    seed.ts
  docs/
    adr/
```

Radar Solutions | Confidential | Page 8

<!-- Start of picture text -->

id PK id PK<br>customers | full_namephone_e164fil-nar UNIQUE 1:N3 cords | customer_idcustonbarcode UNIQUE FK<br>status issued_at<br>tenant_id replaced_by_card_id<br>id PK<br>1:N audit_logs | entityactioncreated_atactor_identity_idmetadata_jsontype customer_idid PK FK 11:of Germ credit_fots | idearn_ledger_idoriginal_amount_koboremaining_amount_koboexpires_at PK Fk 1:Nj<br>loyalty_ledger | type‘amount_kobodirection 1:N redeem redemption allocations | fedeem-ledaer_idid PK Fk<br>aE 1aPK statusemcee ‘amount_koboLot<br>ame . action type reverses_entry_id<br>Username UNIQUE requests/decides ona | created_at<br>passwordbes hash creates wo eydecided_byreason 1:1 earn<br>id PK<br>branches | idnamereceipt PK week rule 1:N3 receipts | branch_idreceipt_numberreceipt_week_startFK<br>status purchase_amount_kobocreated_by<br><!-- End of picture text -->

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

_Figure 2. Core financial and customer data model._

### **8.1 Money and Time Representation**

- All monetary fields use integer kobo in PostgreSQL BIGINT columns and API integer fields suffixed with _kobo.

- API may include formatted display strings, but formatted values are never accepted as financial authority.

- All timestamps are stored as UTC timestamptz. Business week calculations use the configured ShopCity timezone (Africa/Lagos) and branch week-start rule.

- IDs use UUIDs. Public responses do not expose sequential database identifiers.

### **8.2 Core Entities**

| **Entity**             | **Core Fields**                                                                                            | **Purpose**                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| tenants                | id, name, status, created_at                                                                               | Future-ready ownership boundary; one<br>ShopCity tenant in MVP. |
| branches               | id, tenant_id, name, timezone,<br>receipt_week_start_day, status                                           | One branch in MVP; required for uniqueness<br>and future scale. |
| devices                | id, branch_id, name, fingerprint_hash, status,<br>last_seen_at                                             | Optional but recommended attribution of<br>browser/POS device.  |
| users                  | id, tenant_id, branch_id, username,<br>password_hash, role, status, last_login_at                          | Individual accounts; no shared cashier login.                   |
| customers              | id, tenant_id, full_name, phone_e164, is_staff,<br>status, registered_by                                   | One active customer per normalized phone.                       |
| cards                  | id, tenant_id, customer_id, barcode_value,<br>status, issued_at, blocked_at,<br>replaced_by_card_id        | Card lifecycle independent from customer<br>wallet.             |
| receipts               | id, branch_id, receipt_number,<br>receipt_week_start, purchase_amount_kobo,<br>cashier_id                  | Unique purchase evidence key.                                   |
| loyalty_ledger         | id, customer_id, type, direction, amount_kobo,<br>status, receipt_id, reverses_entry_id,<br>correlation_id | Append-only financial record.                                   |
| credit_lots            | id, earn_ledger_id, original_amount_kobo,<br>remaining_amount_kobo, expires_at                             | Supports exact 12-month expiry per earn.                        |
| redemption_allocations | id, redeem_ledger_id, credit_lot_id,<br>amount_kobo                                                        | Records FIFO consumption and preserves<br>expiry correctness.   |
| approvals              | id, action_type, target_type, target_id, status,<br>requested_by, decided_by, reason                       | Supervisor decision trail.                                      |
| idempotency_records    | key, actor_id, endpoint, request_hash,<br>response_json, status, expires_at                                | Replay-safe write APIs.                                         |
| outbox_events          | id, event_type, aggregate_id, payload_json,<br>status, attempts, next_attempt_at                           | Reliable asynchronous publication after DB<br>commit.           |
| sms_messages           | id, outbox_event_id, customer_id,<br>phone_e164, template, status, provider_id,<br>attempts                | Provider delivery audit.                                        |
| fraud_flags            | id, rule_code, severity, transaction_id,<br>cashier_id, status, resolution                                 | Operational review queue.                                       |
| audit_logs             | id, actor_id, action, entity_type, entity_id,<br>request_id, metadata_json, created_at                     | Non-financial trace of sensitive actions.                       |

### **8.3 Database Constraints and Indexes**

```
UNIQUE (tenant_id, barcode_value)
UNIQUE (branch_id, receipt_number, receipt_week_start)
UNIQUE (tenant_id, phone_e164) WHERE customer_status = 'ACTIVE'
UNIQUE (actor_id, endpoint, idempotency_key)
UNIQUE (reverses_entry_id) WHERE type = 'REVERSAL'
CHECK (purchase_amount_kobo > 0)
CHECK (amount_kobo > 0)
CHECK (remaining_amount_kobo >= 0)
CHECK (remaining_amount_kobo <= original_amount_kobo)
INDEX loyalty_ledger (customer_id, status, created_at)
INDEX credit_lots (customer_id, expires_at) WHERE remaining_amount_kobo > 0
INDEX audit_logs (actor_id, created_at)
```

Radar Solutions | Confidential | Page 10

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential `INDEX fraud_flags (status, severity, created_at)`

### **8.4 Expiry-Aware Ledger Design**

A simple SUM(credits) - SUM(debits) ledger is insufficient when each earn expires independently after 12 months. Each confirmed earn must create a credit lot. Redemptions allocate against the earliest-expiring available lots (FIFO by expires_at, then created_at). Expiry jobs debit only the remaining amount of a lot, never the original amount already redeemed.

| **Event**          | **Ledger Effect**   | **Lot/Allocation Effect**                                                                                                |
| ------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| EARN               | Credit ledger entry | Create lot with remaining = earned amount<br>and expires_at = earned_at + 12 months.                                     |
| REDEEM             | Debit ledger entry  | Create allocations against earliest-expiring<br>lots and reduce remaining amounts.                                       |
| REVERSAL OF EARN   | Debit ledger entry  | Only allowed if sufficient related lot remains,<br>otherwise supervisor/admin resolution<br>required.                    |
| REVERSAL OF REDEEM | Credit ledger entry | Restore allocations to original lots where<br>possible; otherwise create restoration lot<br>with original expiry policy. |
| EXPIRY             | Debit ledger entry  | Set expired lot remaining to zero and record<br>exact expired amount.                                                    |
| MANUAL ADJUSTMENT  | Credit or debit     | Admin-only, reason required; credit<br>adjustments create explicit expiry policy.                                        |

## **9. Backend Modules and Responsibilities**

| **Module**         | **Responsibility**                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Auth               | Supabase-backed identity, login/logout, refresh/session rotation,<br>password reset, MFA-ready admin flow, CSRF/session guards. |
| Users              | Create/disable users, roles, branch assignment, last-login and<br>audit.                                                        |
| Branches & Devices | Branch policy configuration, receipt week rules, device registration<br>and status.                                             |
| Customers          | Registration, search, staff exclusion, status changes and<br>normalized phone uniqueness.                                       |
| Cards              | Assignment, lookup, block, lost/replaced lifecycle and one-active-<br>card policy if adopted.                                   |
| Receipts           | Receipt week derivation, uniqueness reservation and purchase<br>evidence record.                                                |
| Loyalty            | Earn, redeem, balance, lots, allocations, reversals, expiry and<br>manual adjustments.                                          |
| Approvals          | Pending action state, supervisor decision and expiry of stale<br>approvals.                                                     |
| Fraud              | Rule evaluation, flags, review, resolution and cashier risk<br>summaries.                                                       |
| Notifications      | Outbox, SMS templates, retries, provider abstraction and delivery<br>status.                                                    |
| Reports            | Liability, issuance, redemption, customers, cashier metrics and<br>exports.                                                     |
| Audit              | Sensitive action logging, security events and immutable query<br>access.                                                        |
| Offline Sync       | Batch validation, per-item result, idempotency and conflict reasons.                                                            |
| Configuration      | Typed tenant/branch policies and audit of policy changes.                                                                       |
| Health/Operations  | Readiness, liveness, build version and dependency status.                                                                       |

Radar Solutions | Confidential | Page 11

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

### **9.1 Cross-Module Transaction Rules**

- Earn orchestration owns receipt reservation, ledger write, credit-lot creation, audit event and outbox event in one database transaction.

- Redeem orchestration locks required credit lots, validates policy, creates allocations and ledger debit in one transaction.

- Approval records do not create financial effects until the approved use case executes with a fresh policy and balance validation.

- Notification failure never rolls back a valid loyalty transaction; the outbox guarantees retry and traceability.

- Reporting queries may use read models/materialized views but never become the source of financial truth.

## **10. API Design Standards**

| **Area**       | **Standard**                                                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base path      | /api/v1                                                                                                                                                        |
| Format         | JSON UTF-8; snake_case or camelCase must be chosen once.<br>This document uses camelCase.                                                                      |
| Authentication | Supabase-backed identity with backend-owned Secure HttpOnly cookies<br>for session/refresh tokens plus CSRF protection for state-changing<br>browser requests. |
| Versioning     | URI major version. Non-breaking additions remain within v1;<br>breaking changes require v2 or migration window.                                                |
| IDs            | UUID strings.                                                                                                                                                  |
| Money          | Integer kobo fields, e.g., purchaseAmountKobo: 1000000.                                                                                                        |
| Phone          | Normalized E.164 value stored internally; masked value returned to<br>cashier where full phone is unnecessary.                                                 |
| Dates          | ISO 8601 UTC timestamps; local business date/week fields<br>explicitly named.                                                                                  |
| Errors         | RFC 7807-style application/problem+json with stable code, title,<br>detail, field errors and requestId.                                                        |
| Pagination     | Cursor pagination for ledger/audit; page/limit acceptable for small<br>admin lists.                                                                            |
| Idempotency    | Idempotency-Key header required for every financial or state-<br>changing POST.                                                                                |
| Correlation    | X-Request-Id accepted/generated and returned.                                                                                                                  |
| Concurrency    | Database row locks or serializable transaction where balance/lot<br>allocation requires it.                                                                    |
| Deprecation    | Sunset/Deprecation headers and changelog before endpoint<br>removal.                                                                                           |
| Documentation  | Every endpoint includes summary, description, auth role, request<br>schema, response examples and errors in OpenAPI.                                           |

### **10.1 Standard Success Envelope**

```
{
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-07-19T10:00:00Z"
  }
}
```

### **10.2 Standard Error**

```
{
  "type": "https://docs.radar.example/problems/duplicate-receipt",
  "title": "Duplicate receipt",
  "status": 409,
  "code": "RECEIPT_ALREADY_USED",
  "detail": "Receipt 10452 has already been recorded for this branch and week.",
```

Radar Solutions | Confidential | Page 12

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential `"requestId": "uuid", "fieldErrors": [] }`

### **10.3 API Contract Governance**

- OpenAPI JSON is generated during CI and committed/published as a build artifact.

- Spectral must pass before merge.

- oasdiff compares the pull request contract with main and blocks undocumented breaking changes.

- Orval client generation must compile in a consumer test project before release.

- Examples in OpenAPI and Bruno must remain synchronized with implementation tests.

## **11. API Endpoint Catalogue**

| **Method** | **Endpoint**               | **Role**         | **Purpose**                               |
| ---------- | -------------------------- | ---------------- | ----------------------------------------- |
| POST       | /auth/login                | Public           | Create authenticated session.             |
| POST       | /auth/logout               | Authenticated    | End session and revoke refresh<br>token.  |
| POST       | /auth/refresh              | Authenticated    | Rotate session/refresh token.             |
| GET        | /auth/me                   | Authenticated    | Return current user and<br>permissions.   |
| POST       | /users                     | Admin            | Create cashier/supervisor/admin<br>user.  |
| GET        | /users                     | Admin            | List users with filters.                  |
| PATCH      | /users/{id}/status         | Admin            | Activate/disable user.                    |
| PATCH      | /users/{id}/role           | Admin            | Change role with audit.                   |
| POST       | /customers                 | Supervisor/Admin | Register customer.                        |
| GET        | /customers                 | Cashier+         | Search by permitted fields.               |
| GET        | /customers/{id}            | Cashier+         | Read customer summary based<br>on role.   |
| PATCH      | /customers/{id}            | Supervisor/Admin | Update allowed profile fields.            |
| PATCH      | /customers/{id}/status     | Supervisor/Admin | Block/activate customer.                  |
| POST       | /cards                     | Supervisor/Admin | Assign a new barcode card.                |
| GET        | /cards/lookup/{barcode}    | Cashier+         | Lookup active card and customer.          |
| POST       | /cards/{id}/replace        | Supervisor/Admin | Block old card and assign<br>replacement. |
| PATCH      | /cards/{id}/status         | Supervisor/Admin | Mark lost/blocked/active.                 |
| POST       | /transactions/earn         | Cashier+         | Record purchase and earn credit.          |
| POST       | /transactions/redeem       | Cashier+         | Redeem confirmed credit.                  |
| GET        | /transactions/{id}         | Cashier+         | Read transaction within role<br>scope.    |
| GET        | /customers/{id}/ledger     | Supervisor/Admin | Paginated customer ledger.                |
| POST       | /transactions/{id}/reverse | Supervisor/Admin | Create compensating reversal.             |
| POST       | /adjustments               | Admin            | Manual credit/debit with reason.          |
| GET        | /approvals                 | Supervisor/Admin | List pending/recent approvals.            |
| POST       | /approvals/{id}/decision   | Supervisor/Admin | Approve or reject.                        |
| POST       | /offline-sync/earn-batch   | Cashier+         | Synchronize offline earning<br>records.   |
| GET        | /fraud-flags               | Supervisor/Admin | Review suspicious activity.               |
| POST       | /fraud-flags/{id}/resolve  | Supervisor/Admin | Resolve/comment on flag.                  |
| GET        | /reports/summary           | Admin/Owner      | Dashboard KPIs.                           |
| GET        | /reports/liability         | Admin/Owner      | Outstanding liability and ageing.         |

Radar Solutions | Confidential | Page 13

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

| **Method** | **Endpoint**                       | **Role**         | **Purpose**                                |
| ---------- | ---------------------------------- | ---------------- | ------------------------------------------ |
| GET        | /reports/cashiers                  | Admin/Owner      | Cashier activity and risk metrics.         |
| GET        | /reports/customers                 | Admin/Owner      | Top, active and dormant<br>customers.      |
| GET        | /reports/redemptions               | Admin/Owner      | Redemption trends/history.                 |
| GET        | /audit-logs                        | Admin/Owner      | Search immutable audit events.             |
| GET        | /notifications/sms/{transactionId} | Supervisor/Admin | View SMS delivery status.                  |
| GET        | /config/public                     | Authenticated    | Frontend-safe branch and policy<br>config. |
| PATCH      | /config/policies                   | Admin            | Update policy with audit.                  |
| GET        | /health/live                       | Public/internal  | Process liveness.                          |
| GET        | /health/ready                      | Internal         | DB/Redis readiness.                        |
| GET        | /version                           | Authenticated    | Build version and contract version.        |

## **12. Critical API Contracts**

### **12.1 POST /api/v1/transactions/earn**

Records a purchase and issues store credit. For purchases above the configured approval threshold, the endpoint returns a pending approval rather than a confirmed ledger effect.

```
Headers:
  Idempotency-Key: <uuid>
  X-CSRF-Token: <token>
Request:
{
  "cardBarcode": "SC-00001234",
  "branchId": "uuid",
  "receiptNumber": "10452",
  "purchaseAmountKobo": 1000000,
  "occurredAt": "2026-07-19T09:44:00+01:00",
  "deviceId": "uuid"
}
201 Confirmed:
{
  "data": {
    "transactionId": "uuid",
    "status": "CONFIRMED",
    "purchaseAmountKobo": 1000000,
    "creditEarnedKobo": 20000,
    "availableBalanceKobo": 145000,
    "expiresAt": "2027-07-19T08:44:00Z",
    "smsStatus": "QUEUED"
  },
  "meta": { "requestId": "uuid", "timestamp": "..." }
}
202 Approval required:
{
  "data": {
    "status": "PENDING_APPROVAL",
    "approvalId": "uuid",
    "reasonCode": "PURCHASE_ABOVE_APPROVAL_THRESHOLD"
  },
  "meta": { ... }
}
```

| **Status** | **Code**         | **Meaning**                           |
| ---------- | ---------------- | ------------------------------------- |
| 400        | VALIDATION_ERROR | Malformed receipt, amount or payload. |

Radar Solutions | Confidential | Page 14

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

| **Status** | **Code**                    | **Meaning**                                                              |
| ---------- | --------------------------- | ------------------------------------------------------------------------ |
| 401        | AUTH_REQUIRED               | No valid session.                                                        |
| 403        | CARD_OR_CUSTOMER_INELIGIBLE | Blocked card/customer or staff account.                                  |
| 409        | RECEIPT_ALREADY_USED        | Receipt exists for branch/week.                                          |
| 409        | IDEMPOTENCY_CONFLICT        | Same key used with different payload.                                    |
| 422        | POLICY_VIOLATION            | Business rule cannot be satisfied.                                       |
| 503        | DEPENDENCY_UNAVAILABLE      | Database/required service unavailable; no<br>financial effect committed. |

### **12.2 POST /api/v1/transactions/redeem**

```
Request:
{
  "cardBarcode": "SC-00001234",
  "branchId": "uuid",
  "receiptNumber": "10501",
  "basketAmountKobo": 2000000,
  "requestedRedemptionKobo": 500000,
  "deviceId": "uuid"
}
201 Confirmed:
{
  "data": {
    "transactionId": "uuid",
    "status": "CONFIRMED",
    "redeemedKobo": 500000,
    "remainingBalanceKobo": 930000,
    "maximumAllowedKobo": 600000,
    "smsStatus": "QUEUED"
  },
  "meta": { ... }
}
```

- Backend re-fetches confirmed balance and available lots inside the transaction.

- Redemption is limited to the smaller of requested amount, available balance and configured basket percentage.

- Lots are consumed in earliest-expiry order and allocations are stored.

- No credit earned on the referenced purchase can be consumed in the same transaction.

### **12.3 POST /api/v1/offline-sync/earn-batch**

```
Request:
{
  "deviceId": "uuid",
  "records": [
    {
      "localId": "uuid",
      "idempotencyKey": "uuid",
      "cardBarcode": "SC-00001234",
      "receiptNumber": "10452",
      "receiptWeekStart": "2026-07-13",
      "purchaseAmountKobo": 1000000,
      "occurredAtLocal": "2026-07-19T09:44:00+01:00"
    }
  ]
}
200:
{
  "data": {
    "results": [
      {
        "localId": "uuid",
        "status": "CONFIRMED",
        "transactionId": "uuid",
        "creditEarnedKobo": 20000
      }
```

Radar Solutions | Confidential | Page 15

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

```
    ]
  },
  "meta": { ... }
}
```

### **12.4 POST /api/v1/transactions/{id}/reverse**

- Supervisor/Admin only; requires reason and idempotency key.

- Original confirmed entry remains unchanged.

- Reversal validation accounts for credit already redeemed or expired.

- Complex reversal that would violate balance/lot integrity returns REVIEW_REQUIRED rather than guessing.

Radar Solutions | Confidential | Page 16

Earn Credit - Confirmed Online Flow

Redeem Credit - FIFO Expiry-Aware Flow

Offline Earn Syne - Conflict-Safe Flow

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

### **13.1 Customer Registration and Card Assignment**

6. Supervisor enters full name and phone number; backend normalizes phone to E.164.

7. Backend checks active-customer uniqueness and staff status.

8. Supervisor scans or enters unused card barcode.

9. Backend creates customer and card atomically, writes audit event and queues registration SMS if adopted.

10. Response returns masked phone, card status and zero balance.

### **13.2 Lost Card Replacement**

11. Supervisor locates customer by phone or identity information.

12. Old card is blocked, not deleted.

13. New barcode is assigned to the existing customer account.

14. No balance transfer transaction is required because balance belongs to customer, not card.

15. Audit event and SMS are created. Repeated replacement may create a fraud flag.

## **14. Authentication, Authorization and Session Security**

### **14.1 Authentication Implementation**

- Individual user accounts only. Shared cashier credentials are prohibited.

- Staff identity and password verification are handled by Supabase Auth; the backend never stores raw passwords.

- Short-lived access/session token stored in Secure, HttpOnly, SameSite cookie; refresh token rotation and revocation stored server-side.

- CSRF token required for state-changing browser requests when cookies are used.

- Admin MFA-ready design; enable MFA when operationally supported.

- Login attempts rate-limited by username, IP and device; failures are security events.

- Sessions expire on inactivity and are force-reviewed/ended at business close.

- Suspended accounts cannot create new sessions until reactivated by an admin.

### **14.2 RBAC Matrix**

| **Capability**                       | **Cashier** | **Supervisor** | **Admin/Owner** | **System** |
| ------------------------------------ | ----------- | -------------- | --------------- | ---------- |
| Scan card / view<br>checkout summary | Yes         | Yes            | Yes             | No         |
| Register customer                    | No          | Yes            | Yes             | No         |
| Assign/replace card                  | No          | Yes            | Yes             | No         |
| Record earn                          | Yes         | Yes            | Yes             | No         |
| Redeem within policy                 | Yes         | Yes            | Yes             | No         |
| Approve high-value<br>action         | No          | Yes            | Yes             | No         |
| Reverse transaction                  | No          | Yes            | Yes             | No         |
| Manual adjustment                    | No          | No             | Yes             | No         |
| View liability reports               | No          | Limited        | Yes             | No         |
| Manage users/policies                | No          | No             | Yes             | No         |
| Run expiry/SMS jobs                  | No          | No             | No              | Yes        |

- `System` is reserved for backend automation and is not assignable to human staff.

### **14.3 Authorization Controls**

- Permissions are enforced by guards and application policies, never only by hidden UI controls.

- Every permission denial and auth event is logged with request ID, user, endpoint and reason.

- Approval cannot be self-approved by the requesting cashier; requester and decision maker must differ for controlled actions.

- Role changes are admin-only, require reason and invalidate affected active sessions.

- Suspension and login denial events are audit logged with actor, target and reason.

Radar Solutions | Confidential | Page 20

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

## **15. Application Security and Data Protection**

| **Control**       | **Requirement**                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Transport         | HTTPS/TLS only in production and staging.                                                                             |
| Headers           | Helmet, strict Content Security Policy for frontend, HSTS and<br>secure cookie flags.                                 |
| CORS              | Explicit frontend origin allowlist; no wildcard credentials.                                                          |
| Input validation  | Global ValidationPipe; whitelist fields; reject unknown payload<br>properties; enforce size limits.                   |
| SQL safety        | Prisma parameterization; raw SQL isolated, reviewed and<br>parameterized.                                             |
| Secrets           | Environment secret manager; Gitleaks; no secrets in repository or<br>logs.                                            |
| PII               | Collect minimum fields; mask phone for cashier; restrict exports;<br>audit sensitive reads.                           |
| Encryption        | Provider-managed encryption at rest; encrypted backups; TLS in<br>transit.                                            |
| Retention         | Audit and financial records retained according to agreed business<br>policy; session/idempotency data expires safely. |
| Dependencies      | Renovate, CodeQL and Trivy with severity-based remediation SLA.                                                       |
| Incident response | Runbook for credential compromise, duplicate credit, data exposure<br>and SMS abuse.                                  |

### **15.1 Rate Limiting Baseline**

| **Endpoint Group** | **Initial Limit**                                           | **Behavior**                                                          |
| ------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Login              | 5 failed attempts / 15 minutes per<br>username+IP           | Temporary block and security event.                                   |
| Card lookup        | 120/minute per user/device                                  | Allow normal scanning; flag scraping<br>pattern.                      |
| Earn/redeem        | 30/minute per cashier and operational<br>anomaly thresholds | 429 for abusive burst; fraud flag for<br>suspicious sustained volume. |
| SMS retries        | Provider-specific capped exponential<br>backoff             | Prevent duplicate messages and runaway<br>cost.                       |
| Reports/exports    | 10/minute per admin with pagination                         | Protect checkout workload.                                            |

## **16. Fraud, Abuse Prevention and Approvals**

| **Rule Code** | **Trigger**                                               | **Severity** | **System Action**                                                        |
| ------------- | --------------------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| FR-DUP-001    | Duplicate branch + receipt + week                         | High         | Block; log attempt; notify<br>supervisor dashboard.                      |
| FR-HV-001     | Purchase above NGN 100,000                                | Medium       | Allow and flag.                                                          |
| FR-HV-002     | Purchase above NGN 200,000                                | High         | Create pending approval; no credit<br>until approved.                    |
| FR-RED-001    | Redemption above NGN 5,000                                | High         | Require supervisor approval.                                             |
| FR-CARD-001   | Same card used above configured<br>daily count            | Medium       | Flag for review; do not<br>automatically punish legitimate<br>customers. |
| FR-CASH-001   | Cashier value/count materially<br>above peers or baseline | Medium       | Flag and surface comparative<br>metrics.                                 |
| FR-ROUND-001  | Repeated rounded purchase<br>values by one cashier        | Low/Medium   | Flag pattern after minimum<br>sample size.                               |
| FR-REV-001    | Unusual reversal frequency                                | Medium       | Flag cashier and supervisor                                              |

Radar Solutions | Confidential | Page 21

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

| **Rule Code** | **Trigger**                                    | **Severity** | **System Action**                                    |
| ------------- | ---------------------------------------------- | ------------ | ---------------------------------------------------- |
|               |                                                |              | decisions.                                           |
| FR-REPL-001   | Frequent card replacement                      | Medium       | Flag customer and supervisors<br>involved.           |
| FR-AUTH-001   | Repeated forbidden API calls/login<br>failures | High         | Rate-limit, log and alert according<br>to threshold. |

### **16.1 Approval State Machine**

- `PENDING -> APPROVED -> EXECUTED -> REJECTED`

- `-> EXPIRED`

```
Rules:
```

- `Decision requires supervisor/admin identity and reason.`

- `Requester cannot approve own controlled action.`

- `Execution revalidates customer, card, receipt, balance and current policy.`

- `Approval alone never guarantees a financial write.`

## **17. Offline Synchronization**

Offline mode is continuity support, not a second ledger. The browser stores minimal pending earn requests in IndexedDB. Redemptions, approvals, card replacement and manual adjustments are blocked offline.

### **17.1 Local Queue Record**

```
{
  "localId": "uuid",
  "idempotencyKey": "uuid",
  "actionType": "EARN",
  "cashierId": "uuid",
  "branchId": "uuid",
  "deviceId": "uuid",
  "cardBarcode": "SC-00001234",
```

- `"receiptNumber": "10452",`

- `"receiptWeekStart": "2026-07-13", "purchaseAmountKobo": 1000000,`

- `"occurredAtLocal": "2026-07-19T09:44:00+01:00", "syncStatus": "PENDING" }`

### **17.2 Conflict Rules**

| **Conflict**                   | **Server Result**                                                       | **User Action**                                            |
| ------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| Duplicate receipt              | REJECTED / RECEIPT_ALREADY_USED                                         | Supervisor reviews receipt and transaction<br>history.     |
| Inactive/replaced card         | REJECTED / CARD_INACTIVE                                                | Supervisor verifies card replacement timing.               |
| Staff customer                 | REJECTED / STAFF_INELIGIBLE                                             | No credit; supervisor reviews mistaken<br>registration.    |
| Idempotent replay              | CONFIRMED with original response                                        | Local record marked confirmed without<br>duplicate effect. |
| Approval threshold exceeded    | PENDING_APPROVAL                                                        | Supervisor reviews online.                                 |
| Invalid local week calculation | Server derives authoritative week and<br>rejects mismatch if suspicious | Supervisor reviews device<br>clock/configuration.          |

Radar Solutions | Confidential | Page 22

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

## **18. SMS and Background Processing**

### **18.1 Outbox Pattern**

Financial transaction and notification intent must commit in the same PostgreSQL transaction using an outbox row. The worker publishes the SMS job after commit. This prevents the two bad states: credit created with no notification record, or SMS sent for a transaction that later rolled back.

### **18.2 Worker Jobs**

| **Queue/Job**          | **Trigger**                                       | **Retry / Failure Policy**                                                        |
| ---------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| sms.send               | Earn, redeem, card replacement, expiry<br>warning | Exponential backoff; bounded retries;<br>permanent failure visible to supervisor. |
| credit.expire          | Scheduled daily                                   | Select due lots in batches; idempotent<br>ledger expiry entries.                  |
| credit.expiry-reminder | 30 days before lot expiry                         | Aggregate per customer/day to control SMS<br>cost.                                |
| fraud.evaluate         | After transaction and scheduled summary           | Fast synchronous rules + deeper<br>asynchronous patterns.                         |
| reports.materialize    | Scheduled or on-demand                            | Refresh read models without blocking<br>checkout.                                 |
| outbox.recover         | Scheduled                                         | Retry unpublished events and alert on aged<br>backlog.                            |

### **18.3 SMS Delivery Rules**

- SMS status is QUEUED, SENT, DELIVERED, FAILED or SUPPRESSED where provider supports delivery reports.

- Transaction success is independent of SMS success.

- Every transaction may send SMS during the first 30-day pilot; low-value batching is a configurable later decision.

- Templates are versioned and tested. No secrets or sensitive internal identifiers appear in messages.

- Provider adapter permits switching vendors without changing loyalty business logic.

## **19. Reporting and Analytics**

| **Report**           | **Definition / Key Fields**                                                                                             | **Freshness**              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Executive summary    | Registered customers, active customers,<br>loyalty purchase value, credit issued,<br>redeemed, expired and outstanding. | Near real-time.            |
| Liability ageing     | Outstanding credit grouped by expiry month<br>and age bucket.                                                           | Near real-time/read model. |
| Cashier activity     | Count/value entered, credit issued,<br>duplicate attempts, reversals, flags and<br>approvals.                           | Near real-time.            |
| Customer performance | Top spenders, top balances, visit frequency,<br>last activity and dormant customers.                                    | Daily or on demand.        |
| Redemption report    | Redemption value, basket ratio, approvals,<br>lots consumed and remaining balance.                                      | Near real-time.            |
| SMS operations       | Queued/sent/failed, provider cost metadata<br>and retry counts.                                                         | Near real-time.            |
| Audit report         | Who changed users, cards, policies and<br>exceptional transactions.                                                     | Immediate immutable log.   |

### **19.1 Metric Definitions**

- Outstanding liability = sum of remaining, unexpired confirmed credit lots.

- Credit issued = sum of confirmed earn ledger credits in selected period, excluding reversals.

- Credit redeemed = sum of confirmed redeem debits in selected period, net of reversals.

Radar Solutions | Confidential | Page 23

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

- Dormant customer = configurable no-confirmed-transaction period; recommended initial threshold 90 days.

- Loyalty purchase value is not total store sales because non-members and unrecorded purchases are outside this system.

## **20. Observability, Reliability and Operations**

### **20.1 Logging and Traceability**

- Pino structured logs include timestamp, level, service, environment, release, requestId, actorId, branchId and endpoint.

- Never log passwords, full tokens, raw cookies, provider secrets or unnecessary full phone numbers.

- Every API response returns requestId. Frontend error reports include the same identifier.

- Sentry receives unhandled exceptions and selected operational failures with PII scrubbing.

- OpenTelemetry-compatible trace context should be propagated even if full tracing is introduced later.

### **20.2 Health and Alerting**

| **Signal**            | **Alert Condition**                                                    |
| --------------------- | ---------------------------------------------------------------------- |
| API error rate        | Sustained 5xx spike or checkout endpoint failure.                      |
| Database              | Readiness failure, connection exhaustion or migration mismatch.        |
| Redis/queue           | Queue unavailable, stalled workers or aged outbox backlog.             |
| SMS                   | Failure rate spike or backlog above agreed age.                        |
| Offline sync          | Unusual rejected/failed sync spike.                                    |
| Security              | Repeated login failures, forbidden access or role escalation activity. |
| Ledger reconciliation | Materialized balance or lot sum mismatch.                              |

### **20.3 Backup and Recovery Targets**

| **Requirement**           | **MVP Target**                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------- |
| Automated database backup | Daily minimum; point-in-time recovery preferred where available.                   |
| RPO                       | Maximum 24 hours for pilot; tighten before full operational<br>dependence.         |
| RTO                       | Same business day restoration target.                                              |
| Restore test              | Perform before launch and periodically thereafter.                                 |
| Redis recovery            | Queues must be reconstructable from outbox/database where<br>financially relevant. |
| Deployment rollback       | Previous stable image and reversible/forward-safe migration plan.                  |

## **21. Testing and Quality Assurance**

| **Test Layer**       | **Scope**                                                                   | **Tool / Minimum Gate**                            |
| -------------------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| Unit                 | Money calculation, policy engine, expiry,<br>FIFO allocation, domain errors | Jest; high branch coverage for financial<br>rules. |
| Application          | Use cases with mocked ports; approval and<br>reversal behavior              | Jest.                                              |
| Database integration | Constraints, transactions, locks,<br>idempotency, migrations                | Jest + Testcontainers PostgreSQL/Redis.            |
| HTTP integration     | DTO validation, auth, RBAC, status/error<br>schemas                         | Supertest.                                         |
| Contract             | Implementation matches OpenAPI and<br>generated client compiles             | Spectral, oasdiff, Schemathesis/contract<br>suite. |
| End-to-end           | Earn, redeem, approval, reversal, offline<br>sync, card replacement         | Playwright/Bruno against staging.                  |

Radar Solutions | Confidential | Page 24

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

| **Test Layer** | **Scope**                                                                  | **Tool / Minimum Gate**       |
| -------------- | -------------------------------------------------------------------------- | ----------------------------- |
| Security       | Secrets, SAST, container scan, baseline<br>dynamic scan                    | Gitleaks, CodeQL, Trivy, ZAP. |
| Performance    | Card lookup, earn, redeem and report<br>isolation                          | k6 pre-release.               |
| Migration      | Forward migration on production-like copy<br>and rollback/forward fix plan | CI dry run.                   |

### **21.1 Coverage and Test Data Policy**

- Critical financial domain packages should target at least 90% branch coverage; overall repository target at least 80%, while meaningful assertions matter more than vanity percentages.

- Use factories and deterministic clocks. Tests must not depend on current real date, network SMS provider or shared external state.

- Staging uses synthetic data only. Production customer data must not be copied into developer machines.

- Every bug affecting ledger, idempotency, permissions or expiry receives a regression test before closure.

### **21.2 Required High-Risk Test Cases**

- Two simultaneous earn requests for the same receipt with different idempotency keys: exactly one succeeds.

- Two simultaneous redemptions against the same balance: total debit cannot exceed available credit.

- Offline retry after client timeout: original response is returned without duplicate credit.

- Redemption across several credit lots: earliest-expiring lots are consumed correctly.

- Expiry after partial redemption: only remaining lot amount expires.

- Reversal of already-partially-consumed earn: system blocks unsafe automatic reversal and requests review.

- Cashier calls admin endpoint directly: 403 and security audit event.

- SMS provider timeout: financial transaction remains committed and job retries.

## **22. CI/CD, Release Management and Environments**

### **22.1 Pull Request Pipeline**

```
install (pnpm --frozen-lockfile)
```

- `-> format check`

- `-> ESLint + architecture boundaries`

- `-> TypeScript typecheck`

- `-> unit tests + coverage`

- `-> integration tests with Testcontainers`

- `-> OpenAPI generation + Spectral lint + oasdiff`

- `-> Prisma migration validation`

- `-> build API and worker`

- `-> Gitleaks + CodeQL + Trivy`

- `-> Docker image build`

### **22.2 Deployment Pipeline**

```
merge to main
```

- `-> immutable version/tag`

- `-> deploy to staging`

- `-> migrate staging`

- `-> readiness + Bruno smoke tests + contract tests`

- `-> manual production approval`

- `-> backup / migration precheck`

- `-> deploy worker then API using controlled strategy`

- `-> post-deploy health, earn/redeem smoke test and monitoring review`

### **22.3 Environment Rules**

| **Environment** | **Use**                                 | **Data and Access**                      |
| --------------- | --------------------------------------- | ---------------------------------------- |
| Local           | Engineer development via Docker Compose | Synthetic seed data; local secrets only. |
| CI              | Automated isolated tests                | Ephemeral PostgreSQL/Redis containers.   |
| Staging         | Frontend integration, QA and release    | Synthetic ShopCity-like data; restricted |

Radar Solutions | Confidential | Page 25

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

| **Environment** | **Use**         | **Data and Access**                                                   |
| --------------- | --------------- | --------------------------------------------------------------------- |
|                 | validation      | team access.                                                          |
| Production      | Live operations | Real data; least privilege; audited admin<br>access; backups enabled. |

### **22.4 Database Migration Rules**

- Never edit a migration already applied to shared environments.

- Prefer expand-and-contract changes for backwards compatibility.

- Destructive changes require explicit ADR, backup and data migration plan.

- API and worker versions must remain compatible during rolling deployment.

- Prisma schema and generated client must be regenerated and checked in CI.

## **23. Documentation Standards**

| **Artifact**               | **Location**                         | **Required Content**                                                                            |
| -------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| README                     | Repository root                      | Purpose, prerequisites, local setup,<br>commands, architecture summary and<br>troubleshooting.  |
| OpenAPI                    | Generated artifact + published Redoc | All endpoints, schemas, examples, auth,<br>errors and deprecations.                             |
| Bruno collection           | /bruno                               | Runnable requests for normal and error<br>journeys.                                             |
| ADRs                       | /docs/adr                            | Context, decision, alternatives,<br>consequences and status.                                    |
| Architecture diagrams      | /docs/architecture                   | C4/component, module dependencies, ERD<br>and sequences as source files.                        |
| Database documentation     | /docs/database                       | Schema overview, invariants, migration<br>policy and reconciliation queries.                    |
| Runbooks                   | /docs/runbooks                       | Deploy, rollback, restore, SMS outage,<br>duplicate credit, lost card and security<br>incident. |
| Changelog                  | Repository root/releases             | Human-readable changes and API breaking<br>notices.                                             |
| Code documentation         | Source                               | Public contracts and non-obvious domain<br>decisions; avoid redundant comments.                 |
| Frontend integration guide | /docs/api                            | Base URL, auth flow, generated client,<br>idempotency, error mapping and mock<br>server.        |

### **23.1 Minimum Endpoint Documentation Checklist**

- Summary and business purpose.

- Allowed roles and authentication method.

- Headers including idempotency and CSRF.

- Request schema with field constraints and example.

- Success responses and state transitions.

- All expected domain error codes and HTTP status codes.

- Whether operation is transactional, asynchronous or approval-dependent.

- Frontend behavior for retry, offline and duplicate submission.

## **24. Backend Implementation Plan**

| **Sprint**     | **Primary Outcomes**                                                                                                                | **Exit Gate**                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 0 - Foundation | Repository, Docker, NestJS/Fastify, Prisma,<br>Redis/BullMQ, config validation, linting, CI,<br>OpenAPI skeleton, health endpoints. | All quality gates pass; staging skeleton<br>deployed. |
|                | Radar Solutions                                                                                                                     | Confidential                                          | Page 26 |     |

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

| **Sprint**                     | **Primary Outcomes**                                                                                              | **Exit Gate**                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1 - Identity and Master Data   | Auth/session, RBAC, users,<br>branches/devices, customers, cards, audit<br>basics.                                | Supervisor can register customer and<br>assign/replace card via documented API. |
| 2 - Earn Ledger                | Receipts, idempotency, earn policy, ledger,<br>credit lots, outbox and SMS.                                       | Concurrent duplicate tests pass; frontend<br>can integrate earn flow.           |
| 3 - Redemption and Approvals   | FIFO allocations, redemption policy,<br>supervisor approvals, reversal and<br>adjustments.                        | No negative balance under concurrency;<br>approval E2E passes.                  |
| 4 - Offline, Fraud and Reports | Offline batch sync, fraud rules, dashboard<br>read models and exports.                                            | Offline conflict suite and reporting<br>definitions accepted.                   |
| 5 - Hardening and Pilot        | Expiry jobs/reminders, security scans, load<br>test, backups, runbooks, training support<br>and pilot monitoring. | Production readiness checklist signed and<br>restore test completed.            |

### **24.1 First Backend Deliverables to Unblock Frontend**

16. Publish OpenAPI contract for authentication, card lookup, customer summary, earn, redeem and standard errors.

17. Publish Prism mock server instructions and sample accounts/data.

18. Generate and version the Orval client package.

19. Implement auth/me, config/public and cards/lookup first so the frontend shell can use real data early.

20. Implement earn endpoint and transaction status next; follow with redemption and approvals.

## **25. Definition of Done and MVP Acceptance Criteria**

### **25.1 Definition of Done for Every Backend Story**

- Business and acceptance rules are explicit and approved.

- Code follows module boundaries and strict TypeScript; lint/typecheck pass.

- Unit and appropriate integration/HTTP tests pass.

- OpenAPI and Bruno examples are updated.

- Errors use stable codes and do not expose internal details.

- Audit/logging/metrics are included where operationally relevant.

- Database migration is reviewed and tested where schema changes occur.

- No high/critical unresolved security findings.

- Pull request is reviewed and changelog/ADR is updated when required.

### **25.2 MVP Release Acceptance**

- Supervisor registers a unique customer and assigns/replaces a barcode card.

- Cashier scans a card and records an eligible purchase using receipt number and final paid amount.

- Backend calculates 2%, stores integer money, blocks weekly duplicate receipts and excludes staff.

- Credit balance is derived from immutable ledger and expiry-aware lots.

- Redemption enforces balance, minimum, basket cap, same-purchase prohibition and approval threshold.

- Supervisor can approve/reject and reverse through compensating entries.

- Offline earn records sync idempotently; offline redemption is blocked.

- SMS is queued asynchronously and delivery is visible without affecting transaction validity.

- Owner can view liability, issuance, redemption, customer and cashier reports.

- Backups, restore test, monitoring, security scans, runbooks and production rollback are ready.

## **26. Risks, Mitigations and Open Decisions**

### **26.1 Principal Risks**

| **Risk**                                           | **Impact**                     | **Mitigation**                                                                                           |
| -------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Manual cashier entry cannot prove the POS<br>total | Fraud or input error           | Individual accounts, receipt uniqueness,<br>thresholds, flags, reversals and daily<br>management review. |
| No POS export for reconciliation                   | Limited automated verification | Owner dashboards, receipt audit, pilot<br>review and future receipt/image or POS<br>integration.         |

Radar Solutions | Confidential | Page 27

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

| **Risk**                                            | **Impact**                          | **Mitigation**                                                                   |
| --------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| Weekly receipt reset misconfigured                  | False duplicate or duplicate credit | Branch week rule configuration, server-side<br>derivation and launch validation. |
| Expiry implemented as simple balance<br>subtraction | Incorrect customer liability        | Credit lots and redemption allocations from<br>first release.                    |
| Frontend and backend contract drift                 | Blocked integration and defects     | OpenAPI-first, generated client, Spectral,<br>oasdiff and contract tests.        |
| Offline queue duplicates                            | Double credit                       | Stable idempotency keys plus receipt DB<br>constraint.                           |
| SMS cost or provider failure                        | Cost leakage or customer distrust   | Outbox, retry caps, delivery reporting and<br>configurable batching.             |
| Overengineering delays MVP                          | Cost and delivery risk              | Modular monolith, required-vs-deferred tool<br>classification and sprint gates.  |

### **26.2 Decisions Requiring ShopCity Confirmation**

| **Decision**                   | **Recommended Default**                                                     |
| ------------------------------ | --------------------------------------------------------------------------- |
| Receipt week definition        | Monday-Sunday unless ShopCity operational week differs.                     |
| Promo items earn credit        | Allow for MVP because item-level data is unavailable; review later.         |
| Minimum redemption             | NGN 500.                                                                    |
| Maximum redemption             | 30% of current basket.                                                      |
| Same-purchase redemption       | Not allowed.                                                                |
| High-value purchase approval   | Above NGN 200,000.                                                          |
| High-value redemption approval | Above NGN 5,000.                                                            |
| SMS batching                   | Send every transaction for first 30 days, then review cost.                 |
| Admin MFA                      | Enable before full production if operationally feasible.                    |
| Dormant customer threshold     | 90 days.                                                                    |
| Credit adjustment expiry       | 12 months from adjustment unless admin selects a documented<br>alternative. |

## **Appendix A - Environment Configuration Catalogue**

| **Variable**                  | **Purpose**                    | **Secret?** |
| ----------------------------- | ------------------------------ | ----------- |
| NODE_ENV                      | development/staging/production | No          |
| PORT                          | API listen port                | No          |
| DATABASE_URL                  | PostgreSQL connection          | Yes         |
| REDIS_URL                     | Redis/BullMQ connection        | Yes         |
| SESSION_SECRET                | Session signing/encryption     | Yes         |
| CSRF_SECRET                   | CSRF token secret              | Yes         |
| ACCESS_TOKEN_TTL              | Session/access lifetime        | No          |
| REFRESH_TOKEN_TTL             | Refresh lifetime               | No          |
| SHOPCITY_TIMEZONE             | Africa/Lagos                   | No          |
| RECEIPT_WEEK_START_DAY        | Configured branch rule         | No          |
| DEFAULT_EARN_RATE_BPS         | 200 basis points = 2%          | No          |
| MIN_REDEMPTION_KOBO           | Policy value                   | No          |
| MAX_REDEMPTION_BASKET_PERCENT | Policy value                   | No          |
| PURCHASE_FLAG_THRESHOLD_KOBO  | NGN 100,000 default            | No          |

Radar Solutions | Confidential | Page 28

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

| **Variable**                           | **Purpose**             | **Secret?** |
| -------------------------------------- | ----------------------- | ----------- |
| PURCHASE_APPROVAL_THRESHOLD_KOB<br>O   | NGN 200,000 default     | No          |
| REDEMPTION_APPROVAL_THRESHOLD_K<br>OBO | NGN 5,000 default       | No          |
| SMS_PROVIDER                           | Provider adapter name   | No          |
| SMS_API_KEY                            | Provider credential     | Yes         |
| SENTRY_DSN                             | Error tracking endpoint | Yes         |
| LOG_LEVEL                              | Structured log level    | No          |
| APP_VERSION                            | Release identifier      | No          |

## **Appendix B - Stable Domain Error Catalogue**

| **Code**                                 | **HTTP** | **Meaning**                                                       |
| ---------------------------------------- | -------- | ----------------------------------------------------------------- |
| AUTH_REQUIRED                            | 401      | Valid session required.                                           |
| SESSION_EXPIRED                          | 401      | Session expired; login again.                                     |
| FORBIDDEN                                | 403      | Role lacks permission.                                            |
| CUSTOMER_NOT_FOUND                       | 404      | Customer does not exist or is outside scope.                      |
| CUSTOMER_BLOCKED                         | 403      | Customer is blocked.                                              |
| STAFF_INELIGIBLE                         | 403      | Staff purchases cannot earn credit.                               |
| CARD_NOT_FOUND                           | 404      | Barcode not assigned.                                             |
| CARD_INACTIVE                            | 403      | Card is blocked/lost/replaced.                                    |
| PHONE_ALREADY_REGISTERED                 | 409      | Active account already uses phone.                                |
| CARD_ALREADY_ASSIGNED                    | 409      | Barcode already assigned.                                         |
| RECEIPT_ALREADY_USED                     | 409      | Duplicate branch/week receipt.                                    |
| IDEMPOTENCY_CONFLICT                     | 409      | Idempotency key reused with different request.                    |
| INSUFFICIENT_BALANCE                     | 422      | Confirmed balance below requested<br>redemption.                  |
| REDEMPTION_BELOW_MINIMUM                 | 422      | Below configured minimum.                                         |
| REDEMPTION_EXCEEDS_BASKET_CAP            | 422      | Exceeds configured basket percentage.                             |
| SAME_PURCHASE_REDEMPTION_NOT_AL<br>LOWED | 422      | Cannot consume credit earned on same<br>purchase.                 |
| APPROVAL_REQUIRED                        | 202      | Action awaits supervisor decision.                                |
| REVERSAL_REVIEW_REQUIRED                 | 422      | Automatic reversal would violate ledger/lot<br>integrity.         |
| OFFLINE_REDEMPTION_NOT_ALLOWED           | 422      | Redemption requires authoritative online<br>balance.              |
| RATE_LIMITED                             | 429      | Too many requests.                                                |
| DEPENDENCY_UNAVAILABLE                   | 503      | Required dependency unavailable; no<br>confirmed financial write. |

## **Appendix C - Initial ADR Register**

| **ADR** | **Decision**                                    |
| ------- | ----------------------------------------------- |
| ADR-001 | Use modular monolith rather than microservices. |
| ADR-002 | Use NestJS with Fastify and strict TypeScript.  |
| ADR-003 | Use PostgreSQL as canonical financial store.    |

Radar Solutions | Confidential | Page 29

ShopCity Loyalty Platform | Backend Technical Architecture | Radar Solutions | Confidential

| **ADR** | **Decision**                                                            |
| ------- | ----------------------------------------------------------------------- |
| ADR-004 | Represent money as integer kobo.                                        |
| ADR-005 | Use append-only ledger plus credit lots and FIFO allocations.           |
| ADR-006 | Use Redis/BullMQ and transactional outbox for asynchronous work.        |
| ADR-007 | Use OpenAPI-first integration and generated frontend client.            |
| ADR-008 | Allow offline earning as pending; prohibit offline redemption.          |
| ADR-009 | Use secure cookie session with CSRF defense for browser<br>application. |
| ADR-010 | Design tenant/branch fields now but deploy one branch in MVP.           |

## **Appendix D - Glossary**

| **Term**              | **Definition**                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| Store credit          | Monetary ShopCity discount value earned from eligible purchases;<br>not cash or transferable money. |
| Ledger entry          | Immutable record of a credit or debit event.                                                        |
| Credit lot            | Remaining amount from a specific earn transaction with its own<br>expiry date.                      |
| Redemption allocation | Record showing which credit lots funded a redemption.                                               |
| Idempotency key       | Client-generated unique key that makes retries safe.                                                |
| Receipt week          | Configured seven-day period used with receipt number and branch<br>for uniqueness.                  |
| Outbox                | Database record of an asynchronous event that must be published<br>after commit.                    |
| Approval              | Supervisor/admin decision required before a controlled action<br>executes.                          |
| Problem Details       | Standard structured API error response with stable domain code.                                     |
| Modular monolith      | Single deployable application separated into enforced domain<br>modules.                            |

Radar Solutions | Confidential | Page 30
