# Sprint 3 Policy Assumptions

Sprint 3 implementation uses these configurable defaults until ShopCity confirms alternatives.

| Policy                          |              Default | Configuration                               |
| ------------------------------- | -------------------: | ------------------------------------------- |
| Minimum redemption              |              NGN 500 | `MIN_REDEMPTION_KOBO=50000`                 |
| Maximum redemption              | 30% of basket amount | `MAX_REDEMPTION_BASKET_PERCENT=30`          |
| High-value redemption approval  |      Above NGN 5,000 | `REDEMPTION_APPROVAL_THRESHOLD_KOBO=500000` |
| Same-purchase redemption        |           Prohibited | Application policy                          |
| Offline redemption              |           Prohibited | Application policy                          |
| Manual credit adjustment expiry |            12 months | `ADJUSTMENT_CREDIT_EXPIRY_MONTHS=12`        |

Implementation notes:

- The backend derives active balance, basket cap, maximum allowed redemption, approval state, and eligibility.
- Clients must not submit or authorize resulting balances, roles, approvals, or policy outcomes.
- Requests that exceed policy are rejected with stable error details instead of being silently reduced.
- Public configuration responses may expose only frontend-safe policy values.
