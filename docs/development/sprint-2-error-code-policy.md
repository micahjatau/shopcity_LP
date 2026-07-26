# Sprint 2 Error-Code Policy

The Sprint 2 earn endpoint intentionally preserves anti-enumeration masking for card and customer eligibility failures.

For `POST /api/v1/transactions/earn`, inactive cards, blocked customers, and staff-ineligible customers map to `404 CARD_NOT_FOUND` rather than distinct `CARD_INACTIVE`, `CUSTOMER_BLOCKED`, or `STAFF_INELIGIBLE` responses. This keeps the cashier-facing earn contract stable and avoids exposing customer/card eligibility details through the financial write endpoint.

Operational workflows that need more specific investigation details should use supervisor/admin customer and card management reads, which are role-limited and audited.
