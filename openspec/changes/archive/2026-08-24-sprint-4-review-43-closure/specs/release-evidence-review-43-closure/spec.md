## ADDED Requirements

### Requirement: Report refresh has end-to-end durable integration evidence

The system SHALL prove report refresh work can move from a persisted outbox event through recovery, publication, worker execution, report materialization, and terminal completion.

#### Scenario: Pending report refresh completes through the worker

- **GIVEN** a persisted `report.refresh` outbox event with `status=PENDING` and an eligible `nextAttemptAt`
- **WHEN** the outbox runtime recovers and publishes work to the worker
- **THEN** the real report materializer creates or updates report materialization output
- **AND** the outbox event becomes `COMPLETED` with `processedAt` set

#### Scenario: Stale published report refresh recovers safely

- **GIVEN** a `report.refresh` outbox event in stale `PUBLISHED` state with `processedAt=null`
- **WHEN** recovery runs
- **THEN** the event is republished and completed without duplicate materialization output

#### Scenario: Completed report refresh is not republished

- **GIVEN** a `report.refresh` event has `processedAt` set
- **WHEN** recovery runs again
- **THEN** the completed event is excluded from recovery

### Requirement: OpenSpec trackers reflect Review 43 truth

The system SHALL keep Sprint 4 OpenSpec trackers consistent with Review 43 findings so no tracker marks an unproven P1 item complete.

#### Scenario: Prior final-gate claims are superseded by Review 43 closure tasks

- **GIVEN** a prior Sprint 4 tracker marked historical reconstruction or online/offline race coverage complete
- **WHEN** Review 43 identifies remaining gaps in that area
- **THEN** the tracker is amended or annotated to show the item is superseded by `sprint-4-review-43-closure`

### Requirement: Final release evidence names one immutable green SHA

The system SHALL record the exact commit SHA, local commands, CI run URL, and validation outcomes used to certify Sprint 4 for Sprint 5.

#### Scenario: Evidence is tied to the implementation SHA

- **GIVEN** Review 43 closure implementation is complete
- **WHEN** local validation and GitHub CI pass
- **THEN** the release evidence document records the same final SHA that passed validation
- **AND** OpenAPI/client/Bruno/OpenSpec evidence is not marked complete unless it was run on that SHA
