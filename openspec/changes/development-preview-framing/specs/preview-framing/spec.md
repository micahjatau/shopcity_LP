## ADDED Requirements

### Requirement: Environment-specific framing policy

The Next application SHALL omit the `frame-ancestors` directive outside production and SHALL emit `frame-ancestors 'none'` in production. It SHALL preserve `frame-src 'none'`, other existing CSP directives, and authentication.

#### Scenario: Development Browser panel

- **WHEN** Next runs with `NODE_ENV=development`
- **THEN** response CSP contains no `frame-ancestors` directive
- **AND** the development preview remains bound to loopback

#### Scenario: Production clickjacking protection

- **WHEN** Next runs with `NODE_ENV=production`
- **THEN** response CSP includes `frame-ancestors 'none'`
- **AND** response CSP includes `upgrade-insecure-requests`
- **AND** script sources do not include `unsafe-eval`
