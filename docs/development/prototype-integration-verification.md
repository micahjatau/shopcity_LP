# Prototype integration verification record

Branch: `workflow-states-implementation`

## Local evidence

| Check                                       | Result                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm test -- --runInBand`                   | Passed                                                                         |
| `npm run build`                             | Passed                                                                         |
| `npm run lint`                              | Passed                                                                         |
| `npm run architecture:check`                | Passed                                                                         |
| `npm run openapi:lint`                      | Passed                                                                         |
| `npm run openapi:diff`                      | Passed with no reported diff failure                                           |
| `npm --prefix apps/web run test`            | Passed                                                                         |
| Browser accessibility tests                 | Passed: 2/2, using production server                                           |
| Critical Playwright flows                   | Passed: 4/4, using production server                                           |
| Configuration controller/service Jest tests | Passed                                                                         |
| `npm run test:integration`                  | 29 suites / 146 tests passed, but exited with Prisma `P3018` migration failure |

## Blocked or requiring shared infrastructure

- Semgrep (`semgrep --config p/ci --error ...`) exceeded the local 60-second execution limit while scanning 1,434 tracked files and exited 124. This is not security clearance.
- GitNexus compare against `master` reports critical risk because the shared worktree contains unrelated dirty source, generated artifacts, and prototype screenshots. A clean exact-SHA comparison requires isolating or preserving those changes first.
- Integration database, deployment, backup/restore, worker/SMS terminal-state, report performance/isolation, and runtime certification evidence require shared infrastructure, valid credentials, and non-synthetic fixtures.

Do not mark runtime certification tasks complete from local tests alone. Attach exact SHA, environment, migration, backup/restore, worker, SMS, and report evidence when the shared run is available.
