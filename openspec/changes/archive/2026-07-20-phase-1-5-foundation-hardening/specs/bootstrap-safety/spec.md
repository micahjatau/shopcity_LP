## ADDED Requirements

### Requirement: Administrator bootstrap credentials must be explicit and safe

The system MUST require an explicit administrator bootstrap password in non-test environments and MUST reject weak default credentials.

#### Scenario: Missing bootstrap password fails

- **WHEN** the bootstrap process runs outside test mode without `DEFAULT_ADMIN_PASSWORD`
- **THEN** the bootstrap process fails

#### Scenario: Weak bootstrap password is rejected

- **WHEN** the bootstrap process receives a known weak password such as `password`
- **THEN** the bootstrap process fails

### Requirement: Bootstrap must not assume a Supabase password already exists

The system MUST ensure the bootstrap flow sets or verifies the administrator Supabase credential explicitly instead of assuming an existing identity already has the correct password.

#### Scenario: Existing Supabase identity is updated safely

- **WHEN** bootstrap finds an existing Supabase identity for the administrator
- **THEN** the flow updates or verifies the password explicitly before reporting success

#### Scenario: Bootstrap does not report false success

- **WHEN** the bootstrap process cannot establish the expected administrator credential
- **THEN** it fails instead of reporting a usable admin login

### Requirement: Local development bootstrap must include Supabase startup

The repository MUST document a local startup sequence that brings up Supabase before seeding and starting the application.

#### Scenario: Documented local setup includes Supabase

- **WHEN** a developer follows the documented local setup flow
- **THEN** the flow includes starting Supabase before running the seed command

#### Scenario: Local seed depends on a reachable Supabase service

- **WHEN** the seed process requires Supabase admin operations
- **THEN** the local workflow fails fast if Supabase is not available
