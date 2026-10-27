# Frontend view-model boundary audit

Reviewed after the page-by-page prototype adaptation.

| View                  | Boundary result                                                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capture Purchase      | `useEarnTransactionController` owns API DTO construction, CSRF/idempotency headers, device/branch/session values, receipt-week calculation, and raw API error mapping. The form receives display state, setters, and typed actions only. |
| Redeem Credit         | `useRedeemTransactionController` owns API DTO construction, CSRF/idempotency headers, authoritative balance/policy calculations, and typed error mapping. The form receives display state and typed actions only.                        |
| Customer registration | `useCustomerRegistrationController` owns generated-client requests, CSRF/idempotency headers, supported-field selection, and success/error transitions. The registration view exposes only supported customer and initial-card fields.   |
| Transactions          | `TransactionDashboard` receives no session or database identifiers from its parent. Report rows and detail responses remain backend-owned; bounded copy prevents them being presented as complete history.                               |
| Login                 | `LoginForm` owns credential submission, device attestation signing, role routing, and recovery copy. Role controls are informational and cannot submit a client-selected role.                                                           |

## Exclusions checked

Migrated view rendering does not display or accept CSRF tokens, session cookies, raw API error objects, database DTO construction, receipt-week internals, or unsupported registration consent/birthday/marketing fields. Device, actor, branch, and customer identifiers remain controller/API concerns and are never user-editable through prototype-only fields.
