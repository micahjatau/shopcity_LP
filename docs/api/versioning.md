# API Versioning

## Policy

- Use URI-based major versioning.
- Keep non-breaking additions within the current major version.
- Promote breaking contract changes only with a new major version or an explicit migration window.

## Compatibility Expectations

- Contract changes should stay aligned with generated clients and mock servers.
- OpenAPI, Spectral, and oasdiff should catch drift before merge.
