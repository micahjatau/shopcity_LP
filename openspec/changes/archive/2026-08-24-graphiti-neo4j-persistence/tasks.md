## 1. Specification and infrastructure

- [x] 1.1 Record the current split-backend diagnosis and canonical namespace.
- [x] 1.2 Add persistent Neo4j Compose service with healthcheck and named volume.
- [x] 1.3 Make Graphiti startup provision/wait for Neo4j with bounded diagnostics.

## 2. Migration and adapter reliability

- [x] 2.1 Add idempotent FalkorDB-to-Neo4j migration for recoverable local memories.
- [x] 2.2 Harden Neo4j connection and health checks against wrong/untracked instances.
- [x] 2.3 Add round-trip persistence/search verification.
- [x] 2.4 Document backup, migration, recovery, and canonical configuration.

## 3. Verification

- [x] 3.1 Validate OpenSpec artifacts.
- [x] 3.2 Run targeted migration/adapter tests and Compose configuration validation.
- [x] 3.3 Run lint/build or the applicable repository verification gates.
- [x] 3.4 Run GitNexus detect-changes and inspect the final diff/status.
