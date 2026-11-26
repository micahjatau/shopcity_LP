# Vercel Preview branch-isolation record — 2026-11-26

## Authorization and scope

The user authorized persistent, branch-specific Preview deployment isolation for `release/preview-workerless-2026-11-24` on four non-target projects: `shopcity-lp`, `shopcity-staging-fix`, `web`, and `shopcity-bb1951f`. Canceled deployment records are acceptable. Do not alter Production behavior, other branches, project build configuration, secrets, hosting plan, or the target API project.

## Existing project settings captured before changes

Read-only `GET /v9/projects/{id}` responses were filtered in memory to these non-secret build settings. All four projects are linked to the `shopcity_LP` GitHub repository, have `gitProviderOptions.createDeployments=enabled`, production branch `master`, `autoExposeSystemEnvs=true`, and `commandForIgnoringBuildStep=null` before the authorized change.

| Project                | Root directory  | Framework          | Build command      | Install command    | Output directory   | Ignored Build Step |
| ---------------------- | --------------- | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ |
| `shopcity-lp`          | `apps/web`      | `nextjs`           | automatic (`null`) | automatic (`null`) | automatic (`null`) | unset (`null`)     |
| `shopcity-staging-fix` | repository root | automatic (`null`) | automatic (`null`) | automatic (`null`) | automatic (`null`) | unset (`null`)     |
| `web`                  | repository root | `nextjs`           | automatic (`null`) | automatic (`null`) | automatic (`null`) | unset (`null`)     |
| `shopcity-bb1951f`     | repository root | automatic (`null`) | automatic (`null`) | automatic (`null`) | automatic (`null`) | unset (`null`)     |

The target API project `shopcity-api` was not changed as part of this isolation. No sensitive environment values were requested or read.

## Exclusion design

Set only `commandForIgnoringBuildStep` for each of the four listed projects to:

```sh
if [ "$VERCEL_GIT_COMMIT_REF" = "release/preview-workerless-2026-11-24" ]; then exit 0; else exit 1; fi
```

Vercel documents that exit 0 skips/cancels the build, while exit 1 continues it; `VERCEL_GIT_COMMIT_REF` is available to the ignored-step command when system environment variables are exposed. These four projects have `autoExposeSystemEnvs=true`. Therefore the exact original release branch is excluded, while `master`/Production and every other branch continue to build. Canceled records are acceptable under the user authorization.

The reviewed commit's `vercel.json` files contain only `git.deploymentEnabled` entries disabling the distinct recertification branch; neither the root nor `apps/web/vercel.json` defines `ignoreCommand`. Consequently, the repository configuration does not override the project-level Ignored Build Step. The `deploymentEnabled` object leaves unspecified branches enabled, so this project-level condition is required.

## Change and verification log

- Pre-change snapshot: recorded above before mutation.
- Configuration writes: `PATCH /v9/projects/{id}` set only `commandForIgnoringBuildStep` on the four authorized non-target projects. No other project setting or environment variable was changed.
- Post-change `GET /v9/projects/{id}` verification: passed for all four. The exact command is stored; `autoExposeSystemEnvs=true`; production branch remains `master`; Git deployment integration remains enabled. A read-only check confirmed `shopcity-api` still has no ignored-build step and was not changed.
- Branch/Production command checks: locally evaluated the exact command with `VERCEL_GIT_COMMIT_REF` set to the target branch (exit 0, skip), `master` (exit 1, continue), and another branch (exit 1, continue). The four projects expose system environment variables, so the branch reference is available to the command.
- Effective repository check: `vercel.json` and `apps/web/vercel.json` in reviewed commit `a6b1a3f` have no `ignoreCommand`; their existing `git.deploymentEnabled` maps disable only the recertification branch. Vercel documents that an `ignoreCommand` in repository config overrides the project setting; none is present. The branch-specific project setting is therefore not overridden.
- At the initial isolation-verification checkpoint, no Git push or deployment had yet occurred. The exclusions remain persistent and were enforced during the subsequent original-branch deployment; see the post-isolation verification below.

## Post-isolation deployment verification

- The original Preview branch `release/preview-workerless-2026-11-24` was fast-forwarded normally to reviewed commit `a6b1a3ff1ffb5bd1162274e40991a06bf6bba879`. The `shopcity-api` deployment completed successfully. Vercel checks show the four non-target projects canceled by their Ignored Build Steps; no other active deployment was created.
- The existing API branch alias resolved to the new deployment automatically; no manual alias retarget was performed. `GET /health/ready` returned HTTP 200 with database and Redis healthy. The readiness endpoint also executes the POS device-token key health indicator; no HMAC value was read and no signed cashier transaction was attempted.
- A scheduler request without credentials returned HTTP 401 and created no job run. The one authenticated F1 request and its successful completion are recorded in `preview-f1-helper-repair-closeout-2026-11-26.md`.
- The four project exclusions remain configured for the exact original release branch. `master`/Production and other branches continue normally. The target `shopcity-api` project settings were not changed apart from the authorized Preview branch `DATABASE_URL` update documented in the closeout. Production was not deployed or modified.
