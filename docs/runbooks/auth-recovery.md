# ShopCity Auth Recovery

Use this runbook when a known ShopCity staff account exists and is ACTIVE but
Supabase Auth rejects the expected password, or when a Supabase dashboard invite
creates an identity that is not linked to ShopCity.

## Current recovery model

ShopCity delegates password verification to Supabase Auth. A production
`DEFAULT_ADMIN_PASSWORD` value does not automatically update an existing
Supabase Auth identity when Vercel deploys the application.

If `admin@shopcity.local` is ACTIVE in ShopCity but Supabase returns invalid
credentials, reset the password using the supported Supabase Auth administration
surface. Do not edit `auth.users.encrypted_password` directly and do not rerun
the complete Prisma seed just to recover one account.

After resetting the Supabase password, set the Vercel
`DEFAULT_ADMIN_PASSWORD` production value to the same strong password so the
bootstrap configuration and Auth identity do not drift again.

Then sign in at:

```text
https://shopcity-lp.vercel.app/login
```

## Supabase Auth URL configuration

Open Supabase Dashboard > Authentication > URL Configuration.

Set the production Site URL to:

```text
https://shopcity-lp.vercel.app
```

Add the production frontend to the redirect allow list:

```text
https://shopcity-lp.vercel.app/**
```

Add only explicitly approved staging or preview frontend origins required for
testing.

The API origin is not the application Site URL:

```text
https://shopcity-api.vercel.app
```

Do not use the API origin as the default destination for invite, recovery or
confirmation email flows.

## Dashboard invitations

A direct Supabase dashboard invitation creates an `auth.users` identity but
does not create the corresponding ShopCity `User` row. Such an identity has no
ShopCity tenant, branch, role or status and cannot be used as an operational
ShopCity account.

To identify recent unlinked Auth identities:

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

Do not grant application privileges by editing Supabase user metadata. ShopCity
authorization is stored in the ShopCity `User` row.

## Staff creation

Once an admin session is restored, create operational staff from:

```text
ShopCity Admin > Users > Create user
```

The ShopCity backend creates the Supabase identity and ShopCity `User` record
together, including branch, role, status and `supabaseAuthId` linkage. If the
ShopCity database write fails, the backend compensates by deleting the newly
created Supabase identity.

## Verification checklist

1. The ShopCity user is ACTIVE.
2. Its tenant is ACTIVE.
3. Its branch is ACTIVE.
4. `supabaseAuthId` points to the intended Supabase Auth identity.
5. The Supabase Auth email matches the ShopCity username.
6. The Supabase identity is confirmed, not banned and not deleted.
7. The chosen password authenticates successfully in Supabase.
8. Vercel `DEFAULT_ADMIN_PASSWORD` is synchronized with the recovered
   bootstrap password.
9. Supabase Site URL points to the web frontend, not the API.
10. Operational users are created from ShopCity rather than directly from the
    Supabase dashboard.
