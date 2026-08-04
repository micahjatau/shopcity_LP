# device-attestation-cutover Specification

## ADDED Requirements

### Requirement: Device attestation uses a dedicated KEK
The system MUST encrypt device attestation secrets with `DEVICE_ATTESTATION_KEK`, and the KEK MUST be separate from session-secret material.

#### Scenario: Production boots without a device KEK
- **WHEN** the application starts in a required environment without `DEVICE_ATTESTATION_KEK`
- **THEN** startup fails before device attestation work can proceed

#### Scenario: Device KEK is distinct from session secret
- **WHEN** attestation configuration is loaded
- **THEN** the device secret encryption key is not derived from `SESSION_SECRET`

### Requirement: Active devices have versioned dedicated attestation secrets
The system MUST store a dedicated encrypted attestation secret, version, and rotation timestamp for every active device.

#### Scenario: Backfill processes a legacy active device
- **WHEN** a device without dedicated attestation secret metadata is migrated
- **THEN** the system assigns a new encrypted secret, increments the version, records the rotation timestamp, and revokes existing sessions

### Requirement: Fingerprint material is not used as attestation signing material
The system MUST fail closed when dedicated attestation ciphertext is missing and MUST NOT use `fingerprintHash` as an HMAC key.

#### Scenario: Legacy active device lacks ciphertext
- **WHEN** an active device attempts attestation without dedicated secret ciphertext
- **THEN** authentication fails with a stable unavailable-secret error and no fingerprint-based fallback is used
