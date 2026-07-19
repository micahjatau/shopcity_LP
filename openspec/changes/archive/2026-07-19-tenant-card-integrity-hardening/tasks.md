## 1. Configuration Hardening

- [x] 1.1 Validate that the configured public tenant and branch resolve to the same tenant before returning public config.
- [x] 1.2 Surface the mismatch as a hard failure so operators cannot serve mixed tenant/branch data.

## 2. Card Lifecycle Hardening

- [x] 2.1 Reject status updates that try to reactivate a replaced card.
- [x] 2.2 Preserve the existing blocked-card flow and one-active-card invariant for valid transitions.

## 3. Test Coverage

- [x] 3.1 Add coverage for a valid public config pair and a mismatched tenant/branch pair.
- [x] 3.2 Add coverage for replaced-card reactivation rejection and valid active-to-blocked updates.
- [x] 3.3 Run the focused test suite that covers configuration and card lifecycle behavior.
