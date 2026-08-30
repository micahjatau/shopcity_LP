# Redis provider selection

## MODIFIED Requirements

### Requirement: Prefer Upstash REST credentials

The Redis client MUST use the supported Upstash REST integration when a complete REST URL/token pair is configured, even if `REDIS_URL` is also present.

#### Scenario: REST and TCP configuration coexist

- **GIVEN** a valid Upstash REST URL and token
- **AND** a `REDIS_URL` is configured
- **WHEN** the Redis client is first used
- **THEN** it MUST use Upstash REST
- **AND** it MUST NOT create a node-redis TCP client

### Requirement: Preserve TCP fallback

The Redis client MUST use `REDIS_URL` when no complete Upstash REST credential pair is configured.

#### Scenario: Only TCP configuration exists

- **GIVEN** no complete Upstash REST URL/token pair
- **AND** a `REDIS_URL` is configured
- **WHEN** the Redis client is first used
- **THEN** it MUST use node-redis with that URL
