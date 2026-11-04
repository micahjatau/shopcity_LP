## Purpose

Defines the configuration boundary for background workers so they validate only dependencies relevant to worker operation and do not require API-only device-attestation secrets.

## ADDED Requirements

### Requirement: Background worker configuration does not require the device-attestation KEK

Background-worker startup validation MUST succeed without `DEVICE_ATTESTATION_KEK` when all worker-required configuration is valid. If the KEK is supplied, its existing strength and secret-separation validation MUST remain in effect. API startup MUST continue to use the full environment contract and require the KEK in environments where it is currently required.

#### Scenario: Outbox and SMS worker starts without a device-attestation KEK

- **GIVEN** the outbox worker has valid database, Redis, retry, and SMS-provider configuration but no `DEVICE_ATTESTATION_KEK`
- **WHEN** its configuration is validated
- **THEN** validation succeeds without weakening any other worker or provider constraint

#### Scenario: Credit-expiry worker starts without a device-attestation KEK

- **GIVEN** the credit-expiry worker has valid database and sweep configuration but no `DEVICE_ATTESTATION_KEK`
- **WHEN** its configuration is validated
- **THEN** validation succeeds

#### Scenario: API configuration remains protected

- **GIVEN** a required API environment omits `DEVICE_ATTESTATION_KEK`
- **WHEN** the full API environment contract is validated
- **THEN** validation continues to fail before API startup

#### Scenario: A supplied device-attestation KEK remains validated

- **GIVEN** a worker environment includes `DEVICE_ATTESTATION_KEK`
- **WHEN** the worker environment is validated
- **THEN** an undersized or reused key is rejected by the existing key-safety rules
