## ADDED Requirements

### Requirement: Redis throttling must use a production-capable client
The system MUST use a shared Redis client for throttling that supports authenticated Redis URLs, TLS-enabled Redis URLs, and the configured database selection.

#### Scenario: Secure Redis URL is accepted
- **WHEN** throttling is configured with a `redis://`, `rediss://`, or authenticated Redis URL
- **THEN** the throttle layer connects through a reusable client and applies request limits

#### Scenario: Redis is unavailable
- **WHEN** the throttle layer cannot reach Redis
- **THEN** the system fails closed with a service-unavailable response

### Requirement: Login throttling must use multiple buckets
The system MUST enforce login limits with separate counters for client IP, normalized account identity, and the combined IP-plus-account pair.

#### Scenario: One IP sprays many usernames
- **WHEN** multiple usernames are submitted from the same IP address
- **THEN** the IP bucket constrains the requests even if the usernames differ

#### Scenario: One account is attacked from many IPs
- **WHEN** the same normalized username is submitted from different IP addresses
- **THEN** the account bucket constrains the requests even if the IPs differ

#### Scenario: The same IP and account are reused
- **WHEN** the same IP address and normalized username are submitted repeatedly
- **THEN** the pair bucket constrains the requests even if the other buckets remain below limit

### Requirement: Card lookup throttling must stay stable across serial changes
The system MUST derive card lookup throttle keys from stable tenant, account, and client context rather than from the requested card serial value.

#### Scenario: Card serial variation does not reset the bucket
- **WHEN** a caller changes the requested card serial while keeping the same client context
- **THEN** the card lookup bucket remains the same
