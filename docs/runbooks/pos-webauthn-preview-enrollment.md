# Vercel Preview POS WebAuthn Enrollment

**Scope: non-production Preview testing only.** This procedure does not qualify hardware, approve recovery, or change the production **NO-GO** decision. The Preview opt-in is disabled by default.

## Required API Preview configuration

Configure these values on the **API Vercel project**, scoped to **Preview only**:

- `WEBAUTHN_PREVIEW_ENROLLMENT_ENABLED=true`
- `WEBAUTHN_DEVICE_QUALIFICATION_APPROVED=false`
- `WEBAUTHN_RP_ID=<exact browser-app Preview hostname>`
- `WEBAUTHN_ALLOWED_ORIGINS=https://<exact browser-app Preview hostname>`
- `DATABASE_URL=<isolated non-production Preview database>`

Set `WEBAUTHN_RP_ID` to the hostname only (no scheme, path, or port). `WEBAUTHN_ALLOWED_ORIGINS` must be the exact HTTPS origin of the browser app that invokes WebAuthn; it is not the API hostname unless the browser app is hosted there. Keep the API's ordinary required secrets configured through the approved Vercel secret workflow. Do not set `VERCEL_ENV` manually; Vercel supplies it, and the API rejects the Preview opt-in unless its runtime reports `VERCEL_ENV=preview`.

Use a stable Preview hostname whose domain matches the configured RP ID. If the deployment's hostname changes, update the exact origin/RP configuration and redeploy before pairing. Do not use a broad origin, wildcard, `vercel.app` as the RP ID, or a Production database. Confirm the Preview database is isolated and has the required additive WebAuthn migrations before enabling the flag.

## Verification and boundaries

1. Confirm the web app and API Preview deployment SHAs and verify the API is connected only to the isolated non-production database.
2. Confirm the API runtime reports `VERCEL_ENV=preview`; keep `WEBAUTHN_DEVICE_QUALIFICATION_APPROVED=false`.
3. Create an unpaired device, then pair it from the exact configured Preview browser origin. Verify a non-Preview runtime rejects the Preview opt-in.
4. Treat virtual-authenticator and Preview results as behavior testing only. Do not use them as real POS hardware, attestation/MDS, Security approval, or production qualification evidence.

If the Preview database, hostname, deployment lineage, or required migration state cannot be confirmed, leave `WEBAUTHN_PREVIEW_ENROLLMENT_ENABLED=false`. Production remains disabled pending the separate qualification and Security approval gates.
