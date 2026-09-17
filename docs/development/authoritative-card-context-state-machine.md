# Authoritative card-context state machine

The cashier financial workflow may only submit after the backend has verified the card context. Browser state is a display and draft mechanism, never a source of card, balance, role, eligibility, or policy authority.

## States

| State              | Entry condition                                                                       | Allowed actions                                         | Transition evidence                                                                       |
| ------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `EMPTY`            | No lookup input or context exists                                                     | Enter/scan a serial; directory discovery                | Input is normalized locally only                                                          |
| `LOOKUP_PENDING`   | Lookup request is in flight                                                           | Cancel/retry; no financial submit                       | Request correlation and loading state                                                     |
| `VERIFIED`         | Backend returns active, in-scope card/customer projection                             | Open Earn/Redeem; refresh; submit using returned serial | Tenant, branch, card, customer, staff, eligibility, balance and policy come from response |
| `REJECTED`         | Backend rejects unknown, inactive, blocked, wrong-scope, staff, or ineligible context | Correct input; retry                                    | Stable error code/message; no financial controls enabled                                  |
| `STALE`            | Route context no longer matches the current verified card or policy                   | Re-lookup; discard stale draft                          | Submit is blocked until fresh verification                                                |
| `SUBMIT_PENDING`   | Earn/Redeem request accepted for processing                                           | Wait; do not duplicate submit                           | Idempotency key and request correlation                                                   |
| `CONFIRMED`        | Server confirms financial effect                                                      | Show receipt/result; start a new lookup                 | Server response is rendered unchanged for authoritative values                            |
| `APPROVAL_PENDING` | Server records a controlled action requiring approval                                 | Show pending state; no claim of final effect            | Approval identifier and server status                                                     |
| `OFFLINE_QUEUED`   | Earn cannot reach backend and queue rules permit local capture                        | Retry/reconcile; no Redeem queue                        | Signed session/device/branch context and explicit retryable state                         |
| `FAILED_RETRYABLE` | Network/dependency failure without financial effect                                   | Retry or queue where permitted                          | No success or balance claim is shown                                                      |
| `SESSION_REQUIRED` | Session expired, revoked, or missing device context                                   | Re-authenticate; clear sensitive context                | Session bootstrap/expiry response                                                         |

## Invariants

1. A directory customer result cannot transition directly to `VERIFIED`.
2. Query parameters can seed lookup input but cannot authorize `VERIFIED`.
3. Any branch, tenant, card, customer, staff, or policy mismatch transitions to `REJECTED` or `STALE`.
4. `CONFIRMED` and `APPROVAL_PENDING` are distinct; pending is never rendered as confirmed.
5. Browser balances and policy values are never submitted as authoritative financial inputs.
6. Logout, expiry, branch change, and failed scope validation clear the verified context.
