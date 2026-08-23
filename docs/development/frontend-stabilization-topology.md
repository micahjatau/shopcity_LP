# Frontend stabilization topology

Phase 1 records deployment placement separately from performance results. This prevents a fast local run from being mistaken for pilot evidence.

| Surface              | Current evidence                                                                                                                                                        | Confidence                       | Follow-up                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| Next/Vercel frontend | Candidate preview `shopcity-8nt67ypkj-micah-s-projects-bb6507fe.vercel.app`; deployment `dpl_BUFQw8n7vVgvSnQv4TjMrsmo3XvD`; SHA `587748d`; build `sfo1`, runtime `iad1` | Exact candidate preview verified | Confirm production promotion only after approval                               |
| API/backend          | Not established by the local route baseline                                                                                                                             | Unknown                          | Capture runtime region and deployment ID from the approved staging environment |
| Supabase/Postgres    | Not established by the local route baseline                                                                                                                             | Unknown                          | Capture project/database region and compare with backend placement             |
| Browser-to-frontend  | Local baseline uses `127.0.0.1:3100`                                                                                                                                    | Local only                       | Do not use as staging latency evidence                                         |

## Required topology evidence

An accepted staging performance artifact MUST include:

- frontend deployment/project and runtime region;
- backend deployment/runtime region;
- Supabase/Postgres project/database region;
- candidate commit SHA and deployment ID;
- whether the frontend-to-backend and backend-to-database hops are same-region;
- observed latency risk and owner for any cross-region hop.

The current Phase 1 baseline records backend/database values as unknown. The candidate frontend placement is verified, but this is not a complete topology pass until backend and database regions are captured.

## Phase 10 observation

The current Vercel inspection confirms the canonical project, exact candidate SHA, deployment ID, build region, and runtime region in `docs/development/frontend-stabilization-deployment-evidence.md`. Backend/database regions remain unknown, production remains on the older SHA, and the duplicate project remains unresolved; this is still a release blocker, not a topology pass.
