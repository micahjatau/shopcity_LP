# ADR 001: Use a Modular Monolith

## Status

Accepted

## Context

ShopCity volume is modest, but correctness and auditability matter. Microservices would add operational cost without solving the core problem.

## Decision

Use a modular monolith with clear feature boundaries.

## Consequences

- Simpler local development and deployment.
- Clearer domain boundaries inside one codebase.
- Future extraction remains possible if the modules stay clean.
