## ADDED Requirements

### Requirement: Bootstrap passwords must be explicit and non-placeholder
The system MUST reject bootstrap passwords that are weak, placeholder-like, or obviously derived from repository examples.

#### Scenario: Placeholder bootstrap password is rejected
- **WHEN** bootstrap receives the documented placeholder password value
- **THEN** the bootstrap process fails

#### Scenario: Weak bootstrap password is rejected
- **WHEN** bootstrap receives a known weak password
- **THEN** the bootstrap process fails

### Requirement: Local Supabase setup must be fully documented
The system MUST document how to start Supabase locally and how to obtain the generated credentials needed by the bootstrap flow.

#### Scenario: Local setup includes generated credentials
- **WHEN** a developer follows the setup guide
- **THEN** the guide explains how to obtain the Supabase URL and service-role credentials before seeding

#### Scenario: Supabase-dependent seed fails fast without credentials
- **WHEN** bootstrap is run without the required Supabase environment values
- **THEN** the bootstrap process fails immediately
