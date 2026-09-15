# Card collision resolution procedure

This procedure is intentionally operator-controlled. It must not merge customers,
credit lots, or ledger history.

1. Freeze card assignment/replacement for the affected tenant.
2. Run `npm run preflight:card-serials -- --tenant-id <tenant>` against a read-only
   replica or transaction snapshot and retain only counts, canonical serials’
   hashes, and operator IDs in evidence.
3. For each collision, verify identity using the approved tenant support process;
   never infer ownership from a card serial alone.
4. Record the selected owner and disposition in an approved change ticket.
5. Reassign or replace cards through the application service, preserving every
   wallet and append-only ledger entry. Do not update ledger history directly.
6. Re-run preflight and confirm zero invalid/collision groups.
7. Lift the freeze only after a supervisor and administrator approve the evidence.

If identity cannot be established, leave the records untouched and escalate.
The migration is designed to abort rather than silently merge wallets.
