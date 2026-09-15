# Vercel project inventory procedure

Review 67 identified named projects that must be classified before retirement:

- `shopcity-api`
- `shopcity-lp`
- `web`
- `shopcity-bb1951f`
- `shopcity-staging-fix`

## Classification steps

1. Authenticate the Vercel CLI with an owner-approved account.
2. For each project, capture non-secret metadata only: project name, account,
   framework/build settings, production aliases, preview aliases, latest
   deployment URL, latest deployment SHA, and environment names.
3. Classify each project as `active`, `obsolete`, or `owner-approved transitional`.
4. Do not disconnect aliases, delete projects, or remove environment variables
   without explicit owner approval recorded in a change ticket.
5. After retiring an obsolete project, verify active aliases still route to the
   approved deployment and record the verification timestamp.

## Build settings source of truth

`vercel.json` may intentionally override dashboard build settings. Until the
owner confirms otherwise, repository `vercel.json` is treated as the source of
truth for reproducible builds and dashboard settings are evidence inputs only.
Any `builds` override warning must be recorded with the deployment evidence and
resolved by either removing the override or documenting why the repository-owned
build command is required.
