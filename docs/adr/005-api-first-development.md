# ADR 005: Use API-First Development

## Status

Accepted

## Context

Frontend work needs a stable contract before all backend features exist.

## Decision

Treat OpenAPI as the shared contract and publish it early.

## Consequences

- Parallel frontend and backend work.
- Contract drift is caught earlier.
- Mock servers and generated clients stay aligned.
