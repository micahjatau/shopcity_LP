# frontend-release-evidence Specification

## Purpose

TBD - created by archiving change frontend-critical-path-hardening. Update Purpose after archive.

## Requirements

### Requirement: Frontend quality gates are mandatory release evidence

The system MUST require frontend lint, typecheck, unit tests, accessibility checks, critical Playwright coverage, visual regression and build checks as part of release evidence.

#### Scenario: Release validation runs

- **WHEN** the frontend release pipeline runs
- **THEN** it executes the documented frontend quality gates rather than a backend-only subset

### Requirement: Fixture routes are not treated as business-flow E2E

The system MUST distinguish deterministic fixture pages from real backend-connected end-to-end coverage.

#### Scenario: Fixture route is exercised

- **WHEN** `/testing/critical-flows` is visited
- **THEN** it is treated as a deterministic test harness and not as proof of business workflow integration

#### Scenario: Real business flow is tested

- **WHEN** Earn or Redeem is exercised in Playwright
- **THEN** the test performs a real or contract-faithful workflow rather than reading static fixture content
