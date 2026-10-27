Worked for 36s

I think your dissatisfaction is justified. The current auth stack has become too complicated for the pilot, and the Supervisor login failure is a symptom of that complexity rather than an isolated password problem.

Right now a simple staff login can depend on all of these layers:

Supabase credentials
↓
ShopCity User mapping
↓
user / tenant / branch status
↓
exact frontend-origin allowlist
↓
Next.js → Nest proxy routing
↓
custom ShopCity session
↓
CSRF cookies
↓
role authorization

Cashier then adds:
↓
device ID in localStorage
↓
device credential cookie
↓
DEVICE_TOKEN / HMAC / WebAuthn compatibility modes

Each mechanism has a rationale. Together, they are creating too many failure modes.

The fact that an active Supervisor with valid credentials can get a generic 401 Invalid credentials because a Vercel Preview hostname isn't in an allowlist is exactly the kind of operational friction I'd remove before pilot.

I would simplify it now

Not by throwing away Supabase or rewriting everything. I would do a bounded auth simplification.

The target architecture should be:

┌─────────────────────┐
│ Supabase Auth │
│ email + password │
└──────────┬──────────┘
│
▼
┌─────────────────────┐
│ ShopCity User │
│ role + branch │
│ ACTIVE status │
└──────────┬──────────┘
│
┌──────────▼──────────┐
│ ShopCity Session │
│ HttpOnly cookie │
└──────────┬──────────┘
│
┌─────────────────┼─────────────────┐
▼ ▼ ▼
CASHIER SUPERVISOR ADMIN
│ │ │
paired POS branch scope tenant scope
required

That's really all the mental model should be.

1. Remove the role selector from login

This UI:

○ Cashier
○ Supervisor
○ Administrator

doesn't add security.

The database already determines:

user.role

A user should simply enter:

Email
Password
Sign in

and ShopCity routes them based on the authenticated role:

CASHIER → /cashier
SUPERVISOR → /supervisor
ADMIN → /admin

There should be no possibility of selecting the "wrong" role.

---

2. Stop using Preview hostname allowlisting as an authentication gate

This caused your problem today.

The browser already talks to:

shopcity-lp...vercel.app
↓
/api/v1/...
↓
Next.js server proxy
↓
ShopCity API

So I'd make that proxy the trust boundary.

Instead of:

Browser origin must exactly equal one of:
CORS_ORIGIN_ALLOWLIST

use:

Browser → same-origin ShopCity web
↓
trusted server proxy
↓
Nest API

The web proxy can authenticate itself to the backend with a server-only proxy credential. The API should reject browser-facing auth requests that bypass that trusted path.

That gets you out of maintaining lists like:

shopcity-lp-git-staging-...
shopcity-lp-git-workflow-states-implementation-...
shopcity-lp-git-some-next-branch-...

while still preserving a security boundary.

I would not simply delete origin protection. Replace it with the BFF/proxy trust model.

---

3. Make DEVICE_TOKEN the only pilot cashier device mechanism

This is another large simplification.

For pilot:

UNPAIRED
↓
DEVICE_TOKEN

That's it.

Don't allow the pilot runtime to make authentication decisions between:

HMAC_LEGACY
WEBAUTHN
DEVICE_TOKEN
UNPAIRED

Keep the compatibility implementation in the codebase if you want, but disable HMAC/WebAuthn as active pilot authentication paths.

The rule becomes easy to explain:

> A cashier needs a valid ShopCity account and a ShopCity-paired POS.

Supervisor and Admin do not.

---

4. I would simplify cashier pairing one step further

Currently the cashier path effectively depends on both:

localStorage:
shopcity:paired-device-id

AND

HttpOnly cookie:
device token

You don't actually need both for the new model.

Make the opaque credential identify the pairing.

For example:

__Host-shopcity_pos_device=<opaque random credential>

Server:

credential
↓ HMAC/hash
DeviceTokenCredential
↓
Device
↓
Branch

Then cashier login becomes:

email
password
paired-POS cookie

No:

x-device-id
localStorage device identifier

required.

That eliminates an entire class of:

> cookie exists but device ID doesn't
> device ID exists but cookie doesn't
> stale localStorage after re-pair
> wrong device selected

problems.

---

5. Keep authorization entirely server-side

This part of the architecture is fundamentally sound.

I would define one clear authorization matrix:

Role Scope POS required

Cashier Assigned branch Yes
Supervisor Assigned branch No
Admin Tenant No
SYSTEM Internal only N/A

And centralize the common checks.

Instead of individual services repeatedly deciding:

if role === SUPERVISOR ...
if branchId !== ...
if role === ADMIN ...

you want reusable concepts such as:

requireRole(...)
requireBranchScope(...)
requireTenantScope(...)
requirePairedPos(...)

The business service should receive an already-authorized context wherever practical.

Resource-specific checks still belong in the service, of course.

---

6. Supabase should authenticate; ShopCity should authorize

I'd make this distinction extremely clear.

Supabase owns

email
password
password reset
credential verification

ShopCity owns

role
tenant
branch
account status
device authorization
financial permissions
sessions/audit

That means a Supabase account by itself gives someone zero ShopCity authorization unless there is a matching active ShopCity User.

That's a good architecture and worth keeping.

---

7. Stop using seeded shared passwords as an operational login mechanism

Seeds are useful for:

local development
automated tests
disposable environments

They shouldn't become how you remember how to log into the actual pilot.

For staging/pilot, I'd provision:

Micah / owner Admin
Supervisor A
Cashier A

as explicit accounts.

And use a real reset/setup workflow for their passwords.

You shouldn't need to remember:

> “Does Supervisor use DEFAULT_ADMIN_PASSWORD? Was the seed run again? Did that reset Supabase?”

That is developer-environment behavior leaking into product operation.

---

8. Fix the error experience

Today virtually everything becomes:

> Sign in failed. The session service is unavailable or the register pairing expired.

That's particularly bad for a Supervisor who doesn't even use register pairing.

The user-facing errors should be something like:

Wrong email or password
Account disabled
ShopCity service unavailable
Cashier POS not paired
Cashier POS pairing revoked
Too many login attempts

without exposing sensitive implementation detail.

And operations should get a request ID:

Sign in couldn't be completed.
Reference: req-ABC123

Then logs contain the actual reason.

---

The target login experience

For you as Supervisor:

┌───────────────────────────────┐
│ ShopCity │
│ │
│ Email │
│ supervisor@shopcity.local │
│ │
│ Password │
│ ••••••••••••• │
│ │
│ Sign in │
│ │
│ Forgot password? │
└───────────────────────────────┘

             ↓

Supabase credential valid?
↓
ShopCity user ACTIVE?
↓
role = SUPERVISOR?
↓
branch ACTIVE?
↓
session created
↓
/supervisor

Nothing about devices, WebAuthn, browser fingerprints, localStorage or Vercel Preview domains should participate.

For Cashier the only additional step is:

Is this browser/POS paired?

---

What I would keep

I would not throw out everything you've built.

Keep:

- Supabase Auth;
- ShopCity User;
- tenant/branch RBAC;
- secure HttpOnly sessions;
- session revocation;
- CSRF protection;
- DEVICE_TOKEN;
- server-side authorization;
- auditing;
- login throttling;
- cashier device revocation.

Those are useful security controls.

What I would remove from the pilot path

Role selection during login
Exact Preview-host CORS dependency
WebAuthn POS authentication
Legacy HMAC POS authentication
localStorage device ID requirement
shared seeded-password operational workflow
generic login errors mentioning register pairing

That is a simplification, not a security downgrade.

---

I would make this the next bounded change

Before continuing release acceptance, I'd open one OpenSpec change along the lines of:

simplify-staff-authentication-and-authorization

with four hard acceptance criteria:

1. Supervisor/Admin: email + password → correct workspace, independent of POS state and Vercel Preview hostname.
2. Cashier: email + password + one opaque paired-POS credential; no localStorage device identity.
3. Authorization: role, branch and tenant determined exclusively by backend state.
4. Environment: deploying a new approved Preview must not require changing application source code merely to make staff login work.

I think this is worth doing before pilot, even though we were trying to avoid more architectural work. Today's login failure shows that auth has crossed the threshold from “complex but functioning” into operationally fragile. A focused simplification here will probably save more time than repeatedly repairing individual authentication symptoms.

Worked for 59s

I compared the proposal against the current docs/TRD.md on workflow-states-implementation. The important finding is that the proposal is mostly consistent with the original security model, but the TRD itself has accumulated contradictory authentication requirements.

The biggest conflict is that the TRD still describes WebAuthn as the primary mandatory cashier-auth architecture in several sections, while later sections have already introduced DEVICE_TOKEN as the pilot mechanism. So before doing another auth implementation, I would reconcile the TRD.

TRD vs proposed simplification

Proposal TRD position Assessment

Remove role selector from login TRD requires individual accounts/RBAC but does not require role selection Fully aligned
Supabase authenticates; ShopCity authorizes Explicit TRD requirement Exactly aligned
Supervisor/Admin use email + password without POS Explicitly stated Exactly aligned
Cashier requires account + paired POS Explicitly required Aligned
Use DEVICE_TOKEN as pilot cashier mechanism Later TRD sections explicitly support it Aligned with current pilot direction, but conflicts with older WebAuthn sections
Remove client localStorage device ID TRD does not require it; later text says server should derive deviceId from persisted credential Actually more TRD-consistent than current implementation
Replace static browser-origin allowlist with trusted BFF/proxy boundary TRD explicitly requires exact allowlisted origin Requires TRD change
Keep server-side RBAC/branch/tenant checks Explicit TRD requirement Exactly aligned
Stop using seed passwords operationally Environment rules imply synthetic seeds belong to development/testing Aligned
Better login errors + request IDs TRD requires stable errors and auditable denials Aligned, with enumeration caveat

---

1. The biggest issue: the TRD contradicts itself on cashier authentication

Early in the TRD, WebAuthn is presented as mandatory.

For example, docs/TRD.md:191 says the MVP includes:

> “mandatory device-bound cashier sessions, WebAuthn credential lifecycle…”

The module table at docs/TRD.md:417 defines Auth as:

> “Supabase-backed identity, two-phase cashier login with WebAuthn…”

And §13.3 is entirely a WebAuthn flow:

password
↓
DEVICE_ASSERTION_REQUIRED
↓
WebAuthn assertion
↓
session bound to deviceId + deviceCredentialId

docs/TRD.md:766-768.

Section 14 repeats it. docs/TRD.md:779-781 says a cashier password must not create a ShopCity session until WebAuthn succeeds.

Then §15 goes further and says hardware-backed, non-exportable, non-syncable credential assurance is a hard pre-production gate. docs/TRD.md:848-850.

But later, §14.3 now says something different.

It explicitly defines four binding modes:

UNPAIRED
HMAC_LEGACY
WEBAUTHN
DEVICE_TOKEN

and says:

> “Pilot DEVICE_TOKEN credentials are additive.”

docs/TRD.md:829-835.

So the document currently has two competing architectural stories:

Older TRD position
Cashier password + mandatory WebAuthn
↓
hardware qualification before production

versus:

New pilot position
Cashier password + DEVICE_TOKEN
↓
paired POS browser credential

That should be fixed before asking an implementation agent to change auth again.

Otherwise an agent can legitimately follow §13.3 and rebuild WebAuthn into a path you're deliberately trying to simplify.

---

2. Removing the role selector is entirely compatible with the TRD

The TRD says:

- individual accounts only (14.1);
- role is part of ShopCity authorization;
- permissions are server-enforced (14.3);
- System isn't available to humans;
- Cashier/Supervisor/Admin have different authorization scopes.

It never says the user should choose their role before authentication.

In fact, role selection is conceptually redundant.

The authoritative sequence should be:

email + password
↓
Supabase identity
↓
ShopCity User
↓
user.role
↓
route accordingly

So this part of the simplification requires essentially no TRD architectural change.

It is just a better frontend interpretation of the existing TRD.

---

3. “Supabase authenticates, ShopCity authorizes” is already the TRD

This proposal is not new architecture.

docs/TRD.md:777 says:

> Staff identity and password verification are handled by Supabase Auth.

Then §14.3 says authorization must be enforced by guards/application policies.

So the clean conceptual boundary I proposed:

Supabase
├─ identity
├─ email
└─ password verification

ShopCity
├─ role
├─ tenant
├─ branch
├─ account status
├─ POS authorization
└─ business permissions

is almost exactly what the TRD already specifies.

I would make this distinction more prominent in the document because it dramatically simplifies reasoning about auth.

---

4. Supervisor authentication difficulty is actually contrary to the TRD

This is important given what happened to you.

The TRD explicitly says at 13.3, line 768:

> “Supervisor/Admin login remains on the current account-authentication path…”

and again at 14.1, line 779:

> “Supervisor/Admin login remains unchanged unless separately approved.”

There is no POS requirement there.

So the intended Supervisor flow is basically:

Supervisor
↓
Supabase credentials
↓
active ShopCity User
↓
active tenant/branch
↓
ShopCity session

Yet the current implementation inserted another pre-auth requirement:

exact browser Origin
↓
must appear in static environment allowlist

which caused your current preview failure.

That is operational behavior added around the TRD's intended login flow.

---

5. DEVICE_TOKEN-only pilot auth is defensible, but the TRD must say it explicitly

This is where I would modify the TRD.

At present §14.3 has already done most of the conceptual work.

It specifies that DEVICE_TOKEN:

- stores only an HMAC of the raw token;
- uses a dedicated HMAC key;
- has one active credential per device;
- is delivered through a Secure, HttpOnly, SameSite=Strict, __Host- cookie;
- binds to tenant/device lifecycle;
- revocation invalidates sessions;
- financial operations trust authenticated session.deviceId.

Those are strong controls.

For the pilot, I would change the architecture statement from:

> WebAuthn is mandatory cashier authentication.

to something more like:

> Cashier sessions must be bound to an authorized ShopCity POS. The pilot binding mechanism is DEVICE_TOKEN. WebAuthn remains a separately qualified stronger device-assurance mechanism and is not required for pilot acceptance.

That reconciles the actual direction of the project.

You can keep all WebAuthn tables/code temporarily if you don't want a destructive cleanup.

But it should no longer be the normative pilot flow in:

- §3.2;
- §9 Auth responsibility;
- §13.3;
- §14.1;
- §15 WebAuthn/POS assurance.

---

6. Removing localStorage device ID is strongly supported by the later TRD

I like this proposal even more after rereading the TRD.

The current browser login effectively supplies:

x-device-id +
__Host-shopcity_pos_device cookie

But §14.3 says the raw POS credential lives in the HttpOnly cookie and:

> session issuance uses the persisted device row's deviceId.

docs/TRD.md:835.

And your schema already supports that cleanly:

model DeviceTokenCredential {
tokenHash String @unique
tenantId String
deviceId String
device Device
}

Therefore the server can conceptually do:

POS cookie
↓
HMAC(cookie)
↓
DeviceTokenCredential.tokenHash
↓
credential.deviceId
↓
Device

It does not need the browser to tell it which device to look for.

That's actually a stronger trust model.

Instead of:

browser says:
"I am device 123"

and gives credential

you have:

browser gives credential

server determines:
"This credential belongs to device 123."

So I would definitely retain this part of the simplification.

---

7. The biggest genuine deviation is the BFF/origin proposal

This is the part where the proposal does depart from the TRD.

The TRD explicitly requires:

> “Explicit frontend origin allowlist; no wildcard credentials.”

docs/TRD.md:852.

And the newer DEVICE_TOKEN text says public login must validate the:

> “exact allowlisted Origin”

docs/TRD.md:833.

So replacing browser-origin allowlisting with a trusted Next.js proxy/BFF is an architectural change, not just implementation cleanup.

But I think it is a reasonable change

You already have:

Browser
↓
ShopCity Next.js
↓
/api/v1 proxy
↓
Nest API

So there is little operational value in making Nest independently know every ephemeral Vercel browser hostname if browser clients are not supposed to call Nest directly anyway.

A cleaner architecture is:

Internet
│
▼
ShopCity Web/BFF
│
│ server-authenticated request
▼
ShopCity API

The browser deals only with its own origin.

The API trusts the web tier as the browser gateway.

But I would modify my earlier proposal slightly

I would not merely remove origin validation.

The TRD replacement should state something like:

> Browser authentication endpoints are exposed through the same-origin ShopCity web/BFF. The BFF validates browser-origin expectations and authenticates itself to the API using a server-only credential or equivalent deployment identity. The backend rejects unauthenticated browser-gateway requests. Direct wildcard credentialed CORS remains prohibited.

That preserves the security objective of §15 while removing the operational dependency on manually maintaining branch Preview hostnames.

---

8. The BFF approach also fits the environment rules better

TRD §22.3 defines:

Local
CI
Staging
Production

It does not define every Git branch preview as a separate security origin that must be manually added to backend configuration.

That suggests today's implementation has conflated:

deployment URL

with:

trusted application environment

Those are not necessarily the same thing.

The BFF model allows:

Preview frontend
↓
its corresponding configured API

Staging frontend
↓
staging API

Production frontend
↓
production API

without source-code changes for every generated Vercel hostname.

That is closer to what §22 appears to intend.

---

9. Centralized authorization strongly matches the TRD

The proposal to centralize:

requireRole()
requireBranchScope()
requireTenantScope()
requirePairedPos()

fits §14.3 very well.

The TRD explicitly requires:

> Permissions are enforced by guards and application policies, never only by hidden UI controls.

The current code already implements much of this. The recommendation isn't to replace resource-specific authorization.

Rather:

Global/common authorization
├─ authenticated?
├─ active account?
├─ correct role?
├─ tenant?
├─ branch?
└─ POS required?

Domain service
├─ owns this customer?
├─ approval requester != approver?
├─ card active?
└─ transaction eligible?

That's a very clean interpretation of the TRD.

---

10. Seeded operational passwords aren't really consistent with the environment model

The TRD says:

Local → synthetic seed data
CI → ephemeral containers
Staging → synthetic ShopCity-like data, restricted access
Production → real data, least privilege

docs/TRD.md:1147-1162.

So using:

DEFAULT_ADMIN_PASSWORD

as a remembered operational credential for Admin, Supervisor and Cashier isn't really the intended long-term model.

The seed can continue creating synthetic accounts for local automation.

But staging acceptance should use explicitly provisioned test operators with controlled credentials.

That change doesn't require much TRD modification; it belongs mainly in the operational/runbook section.

---

11. Error handling proposal needs one correction

The TRD says errors should:

- use stable codes;
- not expose internal details;
- keep cross-branch device failures non-enumerating;
- log permission/auth events with reason.

So I would slightly change the earlier proposal.

I wouldn't necessarily show:

Your account is disabled.

for every pre-auth failure because that confirms the account exists.

Better:

Before authenticated identity is established

Unable to sign in. Check your email and password.
Reference: req-1234

Internally:

INVALID_PASSWORD
DISABLED_ACCOUNT
SUSPENDED_ACCOUNT
ORIGIN_REJECTED
...

After valid credentials establish that this is a Cashier

You can safely be more actionable:

This POS is not paired.

or:

This POS pairing has been revoked.

That preserves the TRD's non-enumeration/security goals while greatly improving supportability.

---

What I think the TRD should become

The biggest change isn't “replace auth.”

It's to simplify the normative model to this:

SUPABASE AUTH
email + password
│
▼
SHOPCITY USER
active + role + tenant + branch
│
┌───────────┴────────────┐
│ │
SUPERVISOR / ADMIN CASHIER
│ │
issue session require POS
│ │
│ DEVICE_TOKEN
│ │
└────────────┬───────────┘
▼
SHOPCITY SESSION
Secure HttpOnly
│
▼
SERVER-SIDE RBAC

WebAuthn becomes:

future/qualified stronger POS authentication

rather than:

pilot prerequisite

---

Specific TRD sections I would change

I would make a small, controlled amendment rather than rewriting the document:

1. §3.2 In Scope — replace mandatory WebAuthn wording with mandatory POS-bound cashier session; identify DEVICE_TOKEN as pilot mechanism.
2. §9 Auth module — change “two-phase cashier login with WebAuthn” to binding-mode-based cashier login, with DEVICE_TOKEN normative for pilot.
3. §13.3 — rewrite as the simple DEVICE_TOKEN pairing/login flow and move WebAuthn to a compatibility/strong-assurance subsection.
4. §14.1 — make one-stage password + POS-token cashier authentication the pilot session path.
5. §14.3 — retain most current DEVICE_TOKEN requirements, remove the dependency on browser-supplied deviceId, and state that the server derives it from the credential.
6. §15 — replace the “WebAuthn hard pre-production gate” with an explicit decision about whether strong hardware device identity is required after pilot.
7. §15 CORS — define the BFF trust boundary rather than manually allowlisting ephemeral frontend Preview hostnames.
8. §22 environments — document how Web Preview → API Preview/staging/production mapping is established without source changes.

My conclusion

I would not reject the simplification because it diverges from the TRD.

I would instead say:

> The proposal exposes that the TRD has not fully caught up with the project's newer DEVICE_TOKEN pilot decision.

About 70–80% of the proposal is already consistent with the TRD: Supabase identity, ShopCity authorization, branch RBAC, server sessions, CSRF, individual accounts, cashier device binding, audit and revocation all stay.

The real architectural changes are only:

WebAuthn → DEVICE_TOKEN as the normative pilot path,
client device-ID + token → token alone determines device, and
static browser-origin allowlist → explicit same-origin BFF trust boundary.

Those are the three decisions I would record in one ADR/OpenSpec change before touching more auth code.

Given the problems you've experienced, I think that is a better direction than continuing to patch the current hybrid of WebAuthn, HMAC, DEVICE_TOKEN, localStorage device IDs, exact-preview CORS matching, and custom sessions.
