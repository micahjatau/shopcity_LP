## ADDED Requirements

### Requirement: Bootstrap passwords must reject placeholders and weak defaults
The system MUST reject bootstrap passwords that are documented placeholders, obviously weak values, or too short for production use in non-test environments.

#### Scenario: Repository placeholder is rejected
- **WHEN** bootstrap receives the documented placeholder password from the example environment file
- **THEN** the bootstrap process fails

#### Scenario: Weak password is rejected
- **WHEN** bootstrap receives a known weak password such as `password` or `admin123`
- **THEN** the bootstrap process fails

#### Scenario: Short password is rejected
- **WHEN** bootstrap receives a password shorter than the minimum policy
- **THEN** the bootstrap process fails

### Requirement: Bootstrap must require explicit Supabase credentials
The system MUST fail fast when the bootstrap path does not have the required Supabase URL and service-role credentials.

#### Scenario: Missing Supabase service role key fails fast
- **WHEN** bootstrap is started without `SUPABASE_SERVICE_ROLE_KEY`
- **THEN** the bootstrap process fails before seeding

#### Scenario: Missing Supabase URL fails fast
- **WHEN** bootstrap is started without `SUPABASE_URL`
- **THEN** the bootstrap process fails before seeding
