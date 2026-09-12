# Card serial migration preflight

Run the read-only preflight before introducing a canonical serial index:

```sh
npm run preflight:card-serials
```

The command reports counts and collision groups as JSON. Exit code `2` means
at least one tenant has multiple card rows that normalize to the same serial.
Do not proceed with an automatic update when collisions exist. An authorized
operator must identify the wallet owner for each card, preserve both card
histories, and assign a new unique serial to one card through the normal card
lifecycle. Never merge balances or delete card history as part of collision
resolution.

After all collision groups are resolved, run the preflight again and retain the
JSON output with the migration evidence. Noncanonical rows can then be updated
in a separately reviewed expand-and-contract migration.
