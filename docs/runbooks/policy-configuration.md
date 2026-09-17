# Policy Configuration Runbook

## Scope

Policy configuration is tenant- and branch-scoped. Only authenticated Admins may read or mutate it through `/api/v1/config/policies`.

The persisted branch row is authoritative for Earn, Redeem, and fraud threshold evaluation. Environment values are bootstrap fallbacks until a branch policy row exists.

## Safe update procedure

1. Load the current policy for the target branch.
2. Confirm the branch and tenant scope before changing values.
3. Submit all policy values with the returned `expectedVersion`.
4. Treat `409 POLICY_VERSION_CONFLICT` as a stale editor: reload and review the newer values; never retry the old payload blindly.
5. Confirm the response version increased and retain the audit event `configuration.policy.updated`.

## Validation bounds

- Earn rate: `0..10000` basis points.
- Monetary values: safe integer kobo values; minimum redemption and redemption approval threshold must be positive.
- Basket cap: `1..100` percent.
- Purchase approval threshold must not be below the fraud flag threshold.
- Purchase ceiling must not be below the purchase approval threshold.
- Redemption approval threshold must not be below the minimum redemption.

## Rollback

Policy updates are versioned and audited. To revert a change, submit the desired prior values using the current version; do not edit or delete the audit record. If the policy endpoint or database is unavailable, stop mutation attempts and use the environment fallback only as an emergency operational baseline while preserving incident evidence.

## Access review

Cashier and Supervisor requests must receive authorization failure and have no policy mutation controls in the UI. Cross-tenant or inactive-branch requests must be rejected by the backend even when a valid branch identifier is supplied.
