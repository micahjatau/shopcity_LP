# ShopCity Auth Recovery

Use this runbook when a known ShopCity staff account exists and is ACTIVE, but
Supabase Auth rejects the expected password, or when a Supabase dashboard invite
creates an identity that is not linked to ShopCity.

## Safety rules

- Do not update `auth.users.encrypted_password` directly.
- Do not rerun the full Prisma seed just to recover one account. The seed can
  reset multiple bootstrap identities.
- Do not paste production passwords into GitHub issues, pull requests, chat,
  logs, shell history, or documentation.
- Create operational staff through ShopCity Admin > Users. A dashboard-only
  Supabase invite does not create the required ShopCity tenant/branch/role
  record.

## Recover the bootstrap admin

The recovery utility uses the supported Supabase Admin API to synchronize the
already-linked `admin@shopcity.local` identity with
`DEFAULT_ADMIN_PASSWORD`. It refuses non-admin, inactive, mismatched, or
unlinked identities. After the Supabase update it verifies the password using
normal password authentication, revokes existing ShopCity sessions, and writes
an `auth.admin.recovery` audit record.

Run it from a checkout linked to the `shopcity-api` Vercel project:

```bash
npm ci
npm exec -- vercel env run --environment production --project shopcity-api -- \
  sh -c 'AUTH_RECOVERY_CONFIRM=RECOVER_ADMIN_AUTH npm run auth:recover-admin'
```

The utility never prints `DEFAULT_ADMIN_PASSWORD`.

If a different linked admin must be recovered intentionally, set
`ADMIN_RECOVERY_USERNAME` inside the command. The script still requires the
ShopCity user to have the `ADMIN` role and an ACTIVE tenant, branch and user
record.

## Verify login

Use the public web application:

```text
https://shopcity-lp.vercel.app/login
```

Authenticate with:

```text
admin@shopcity.local
<current DEFAULT_ADMIN_PASSWORD>
```

A successful recovery should create a fresh ShopCity session. Old active
ShopCity sessions for the recovered admin are revoked by the recovery command.

## Supabase Auth URL configuration

For hosted Supabase, open Authentication > URL Configuration.

Set the production Site URL to:

```text
https://shopcity-lp.vercel.app
```

Add the production frontend to the redirect allow list:

```text
https://shopcity-lp.vercel.app/**
```

Add only explicitly approved staging/preview origins required for testing.

The API origin is not the application Site URL:

```text
https://shopcity-api.vercel.app
```

Do not use that API origin as the default destination for invite, recovery or
confirmation email flows.

## Dashboard invitations

A direct Supabase dashboard invitation creates an `auth.users` identity but
does not create the corresponding ShopCity `User` row. Such an identity has no
ShopCity tenant, branch, role or status and should not be treated as an
operational account.

To detect recent unlinked identities:

```sql
select
  au.id,
  au.email,
  au.invited_at,
  au.confirmed_at,
  au.last_sign_in_at,
  au.created_at
from auth.users au
left join "User" u
  on u."supabaseAuthId" = au.id::text
where u.id is null
order by au.created_at desc;
```

Do not grant a role by editing Supabase metadata. ShopCity authorization is
stored in the ShopCity `User` row and enforced by the application.

## Staff creation after admin access is restored

Use:

```text
ShopCity Admin > Users > Create user
```

The ShopCity backend creates the Supabase identity and the ShopCity user record
as one compensated operation, including branch, role, status and
`supabaseAuthId` linkage.

## If recovery fails

1. Confirm the ShopCity user is ACTIVE.
2. Confirm its tenant and branch are ACTIVE.
3. Confirm `supabaseAuthId` matches the intended Supabase Auth identity.
4. Confirm the Vercel production environment has:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DEFAULT_ADMIN_PASSWORD`
5. Confirm `DEFAULT_ADMIN_PASSWORD` is strong and is not a placeholder.
6. Run the recovery utility again only after correcting the failed prerequisite.
