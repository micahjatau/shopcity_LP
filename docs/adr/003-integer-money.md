# ADR 003: Store Money as Integer Kobo

## Status
Accepted

## Context
Floating point math is unsafe for financial calculations.

## Decision
Store and process all money values as integer kobo.

## Consequences
- No floating point rounding drift.
- Stable accounting and reporting behavior.
