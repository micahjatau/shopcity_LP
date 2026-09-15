## ADDED Requirements

### Requirement: Business-day report cutoffs are timezone-correct

Historical report materialization MUST convert local report dates to exclusive cutoffs using the configured IANA business timezone rather than treating local midnight or end-of-day text as UTC.

#### Scenario: Event falls across a Lagos day boundary

- **GIVEN** a report date in `Africa/Lagos` and events before and after the local day ends
- **WHEN** the historical report is materialized
- **THEN** events before the exclusive local-day cutoff are included
- **AND** events at or after the cutoff are excluded

### Requirement: Branch SMS ownership includes card-linked messages

Branch-scoped SMS reports MUST resolve ownership through receipt, card/customer, or supported customer relationships and MUST NOT omit valid card-linked replacement messages.

#### Scenario: Replacement SMS has no receipt

- **GIVEN** a card-replacement SMS linked to a card and a customer in branch A
- **WHEN** branch A SMS reporting is requested
- **THEN** the replacement SMS is included exactly once
- **AND** another branch cannot observe it

#### Scenario: Tenant-wide SMS reporting

- **GIVEN** receipt-linked and card-linked SMS messages in multiple branches
- **WHEN** a tenant-wide report is requested
- **THEN** all authorized messages are included exactly once
- **AND** unresolved branch ownership is not assigned by guesswork

### Requirement: Runtime certification is exact-SHA and complete

Release certification MUST use one immutable candidate reachable from protected `master`, and the API, frontend, and worker MUST be proven to run that exact candidate before production promotion.

#### Scenario: Candidate provenance matches

- **GIVEN** a frozen candidate SHA with passing protected checks
- **WHEN** staging and production certification execute
- **THEN** API and worker provenance match the candidate SHA
- **AND** evidence records deployment identity, readiness, and required verifier results

#### Scenario: Candidate evidence is incomplete

- **GIVEN** a SHA mismatch, missing worker readiness, invalid performance fixture, or missing terminal SMS evidence
- **WHEN** release certification evaluates the bundle
- **THEN** certification fails closed
- **AND** the candidate is not promoted
