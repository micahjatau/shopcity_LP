## Context

The current receipt path has four related gaps: one config convention mismatch, one missing numeric ceiling, one stale migration record, and one weak device trust boundary. These are not independent in practice because they all affect whether a receipt capture or login is treated as trustworthy.

## Goals / Non-Goals

**Goals:**
- Make receipt-week configuration deterministic across validation and capture.
- Add a finite purchase ceiling that rejects absurd values early.
- Require cryptographic proof of device possession before a session can be tied to a device.
- Keep migration-tracker hygiene part of the schema-change workflow.

**Non-Goals:**
- Redesigning the entire auth stack.
- Introducing a new frontend flow beyond the minimum required for device attestation.
- Reworking existing approval thresholds or review states beyond the hard maximum check.

## Decisions

- Use one weekday numbering convention everywhere, matching the current branch/env shape instead of preserving the capture-time mismatch. This avoids hidden runtime failures from configuration that already passes startup validation.
- Add a dedicated purchase ceiling rather than reusing approval thresholds. Approval thresholds are workflow policy; the ceiling is a safety rail.
- Model device trust as possession of the existing per-device `fingerprintHash` material, used as an HMAC secret for a signed attestation header. This preserves cryptographic proof-of-possession without adding a new device enrollment table or key-rotation workflow.
- Treat the migration tracker as a release artifact, not just an informal note. The tracker should be updated whenever a migration lands so future upgrades and restores remain auditable.

## Risks / Trade-offs

- [Device attestation adds onboarding complexity] → Mitigate with a simple enrollment flow and clear test fixtures.
- [A hard purchase ceiling may block legitimate edge cases] → Mitigate by making the ceiling explicit and test-covered, not hidden in review thresholds.
- [Tracker discipline can drift] → Mitigate by making tracker updates part of the task checklist and release review.
- [Weekday convention changes can confuse existing operators] → Mitigate with one consistent convention and explicit validation messages.

## Migration Plan

1. Update validation and capture logic for the weekday convention.
2. Add the purchase ceiling and cover it with tests.
3. Introduce login-time device attestation verification using the stored fingerprint secret.
4. Update the migration tracker with the current migration entry.
5. Run the receipt and migration upgrade suites before release.

Rollback is straightforward for the config and validation changes. The device-attestation work is data-compatible because it reuses the existing device fingerprint field.

## Open Questions

- Should the hard purchase ceiling be a fixed repository default or a required environment variable?
- Do we want the migration tracker to be enforced by CI, or just by review discipline?
