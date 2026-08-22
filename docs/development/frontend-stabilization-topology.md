# Frontend stabilization topology

Phase 1 records deployment placement separately from performance results. This prevents a fast local run from being mistaken for pilot evidence.

| Surface              | Current evidence                                                                          | Confidence                             | Follow-up                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| Next/Vercel frontend | `shopcity-lp.vercel.app`; release evidence records `fra1` for the approved staging target | Recorded in existing sprint-5 evidence | Reconfirm against the exact stabilization candidate SHA                        |
| API/backend          | Not established by the local route baseline                                               | Unknown                                | Capture runtime region and deployment ID from the approved staging environment |
| Supabase/Postgres    | Not established by the local route baseline                                               | Unknown                                | Capture project/database region and compare with backend placement             |
| Browser-to-frontend  | Local baseline uses `127.0.0.1:3100`                                                      | Local only                             | Do not use as staging latency evidence                                         |

## Required topology evidence

An accepted staging performance artifact MUST include:

- frontend deployment/project and runtime region;
- backend deployment/runtime region;
- Supabase/Postgres project/database region;
- candidate commit SHA and deployment ID;
- whether the frontend-to-backend and backend-to-database hops are same-region;
- observed latency risk and owner for any cross-region hop.

The current Phase 1 baseline intentionally records the unresolved backend/database values as unknown. It is not a topology pass.
