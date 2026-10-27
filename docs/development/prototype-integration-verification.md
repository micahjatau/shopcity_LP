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

- Semgrep (`semgrep --config p/ci --error ...`) exceeded the local execution limit both for the full repository (1,434 tracked files) and affected backend directories (56 files); both exited 124. This is not security clearance.
- `npm run test:integration` completed 29 suites and 146 tests, but the overall command still exited with Prisma `P3018`; the clean migration/deployment gate remains unresolved.
- GitNexus `detect-changes --scope all` completed successfully with no changes detected in the current indexable working-tree scope.
- GitNexus `detect-changes --scope compare --base-ref master` completed successfully but reports 59 files, 63 symbols, 36 affected processes, and CRITICAL risk. The shared worktree contains unrelated dirty source, generated artifacts, and prototype screenshots, so the result cannot confirm that only this integration's symbols and flows changed. A clean exact-SHA comparison requires isolating or preserving those changes first.
- Integration database, deployment, backup/restore, worker/SMS terminal-state, report performance/isolation, and runtime certification evidence require shared infrastructure, valid credentials, and non-synthetic fixtures.

Do not mark runtime certification tasks complete from local tests alone. Attach exact SHA, environment, migration, backup/restore, worker, SMS, and report evidence when the shared run is available.
