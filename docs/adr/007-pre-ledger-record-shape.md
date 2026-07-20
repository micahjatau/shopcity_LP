# ADR 007: Keep the Pre-Ledger Record as `receipt`

## Status

Accepted

## Context

The pre-ledger purchase record needs a stable public name before loyalty earning and redemption work begins.

## Decision

Use `receipt` as the product and domain term for the pre-ledger purchase record.

## Consequences

- Existing `Receipt` modeling stays aligned with the contract.
- `sale-record` is not used as the public-facing name.
- Ledger work can attach to the receipt concept without another rename.
