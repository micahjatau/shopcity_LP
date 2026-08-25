## ADDED Requirements

### Requirement: Raw device secrets are never persisted in browser storage

The frontend MUST NOT write raw device attestation secrets to localStorage, sessionStorage, URL parameters, analytics payloads, or ordinary application logs.

#### Scenario: Login form handles a device secret

- **WHEN** a user enters or receives a device attestation secret
- **THEN** the secret is held only in transient controlled state required for provisioning or authentication
- **AND** browser storage contains no raw secret after the operation

### Requirement: Device provisioning presents a secret only once

The provisioning flow SHALL make clear that a newly issued secret is one-time material, offer an explicit secure copy action, and clear the plaintext from UI state when the user finishes or leaves the provisioning flow.

#### Scenario: Admin provisions a device

- **WHEN** the backend returns a newly issued device secret
- **THEN** the UI presents it once with a warning and copy control
- **AND** the UI does not expose it in a URL or persistent storage
- **AND** leaving or completing the screen clears the displayed secret

### Requirement: Normal login returns a backend-owned device identity

A successful device-bound cashier login SHALL establish the backend-owned device/session association and expose the authenticated device ID through session bootstrap.

#### Scenario: Cashier signs in on a provisioned POS

- **WHEN** the cashier completes the normal sign-in flow
- **THEN** the session response identifies the authenticated device when valid
- **AND** the shell and Offline Earn use that device identity
- **AND** no browser-generated placeholder is used

### Requirement: Device-unready state blocks device-dependent work

The frontend SHALL block or clearly gate Offline Earn when the authenticated session lacks a usable device identity or required attestation readiness.

#### Scenario: Cashier has no usable device identity

- **WHEN** Offline Earn is opened without device readiness
- **THEN** the page explains that device-bound sign-in or provisioning is required
- **AND** it does not construct a queue record with undefined or guessed device data

### Requirement: Provisioning and rotation preserve auditability

Device provisioning and rotation UI SHALL use backend-authoritative responses and expose success/failure states without displaying secret values in audit or telemetry text.

#### Scenario: Device secret rotation succeeds

- **WHEN** an authorized administrator rotates a device secret
- **THEN** the UI reports completion and required re-provisioning
- **AND** the backend audit event remains the source of truth
- **AND** the plaintext secret is cleared after controlled delivery
