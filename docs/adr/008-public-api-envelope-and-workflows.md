# ADR 008: Public API Envelope And Financial Workflows

## Status
Accepted

## Context
The TRD describes a `{ data, meta }` success envelope and RFC 7807-style errors, while the implemented and generated OpenAPI contract uses `{ success, data, meta }` for successful responses and `{ success, error, meta }` for errors. Sprint 2 also exposes duplicate financial workflows through receipt-specific endpoints beside the canonical transactions and approvals APIs.

## Decision
Keep the implemented response envelope for the MVP public API:

- Success responses use `{ success: true, data, meta }`.
- Error responses use `{ success: false, error, meta }`.
- Error objects expose stable domain `code`, HTTP `statusCode`, message, and optional details.

New frontend integration must use these canonical financial workflows:

- `POST /api/v1/transactions/earn` for earning from a POS receipt.
- `GET /api/v1/approvals` for supervisor approval queues.
- `POST /api/v1/approvals/{id}/decision` for approval decisions.

Receipt-specific write and decision endpoints are deprecated for new frontend integration. They may remain temporarily for compatibility while clients migrate to the canonical transaction and approval endpoints.

## Consequences
- OpenAPI remains aligned with the current backend implementation.
- The TRD response-envelope wording is superseded by this ADR for the MVP unless a later ADR reverses the decision.
- Frontend clients should map stable domain error codes rather than raw exception messages.
- Duplicate public financial endpoints must not be expanded in Sprint 3.
