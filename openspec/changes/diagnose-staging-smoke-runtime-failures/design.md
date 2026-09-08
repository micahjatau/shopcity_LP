# Design: Staging smoke runtime reliability

## Approach

1. Preserve the exact master-lineage candidate and reproduce failures against the currently deployed staging aliases.
2. Improve unexpected-exception observability at the existing global filter boundary using request IDs and safe structured fields only.
3. Use the resulting diagnostics to distinguish session bootstrap failures from ledger query/serialization failures and runtime configuration or schema defects.
4. Add focused unit/integration coverage for each confirmed failure before changing behavior.
5. Apply the smallest repair: runtime configuration if deployment-only, code if application behavior is defective, or an expand-and-contract migration if schema drift is proven.
6. Redeploy the same candidate lineage, run targeted checks, then run exact-SHA staging certification.

## Boundaries and safety

- Do not log headers, cookies, tokens, secrets, raw URLs with query data, or request bodies.
- Do not fabricate or directly write plaintext device-attestation secrets through SQL.
- Do not mutate or delete confirmed financial or audit history.
- Do not weaken auth, RBAC, rate limiting, or release provenance controls.
- Keep one writer per working tree and preserve unrelated changes.

## Diagnostic points

- `HttpExceptionFilter`: request-correlated unexpected exception logging.
- Auth smoke bootstrap transaction: session and device-attestation persistence.
- `LoyaltyService.listCustomerLedger`: Prisma relation loading, pagination, BigInt conversion, and SMS lookup.
- Vercel deployment logs and smoke JUnit/evidence: correlate request IDs and failing routes.

## Verification

- Unit tests for safe diagnostics and confirmed exception mappings.
- Targeted auth and loyalty service tests.
- Build and lint.
- Smoke workflow with candidate SHA `891c1d9e68daf602325df7a0f0c481a0e108c865`.
- Three consecutive exact-SHA certifications after all failures are resolved.
