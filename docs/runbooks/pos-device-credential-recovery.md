# POS Device Credential Recovery

**Status: DRAFT — not approved for pilot or production.** This procedure documents a proposed recovery path only. It is not evidence of an approved security policy, qualified hardware, or authorized production pairing. The production gate remains **NO-GO** in [`pos-webauthn-qualification.md`](./pos-webauthn-qualification.md). Obtain named Security and Operations approval and complete a tabletop exercise before using this procedure in a pilot or production environment.

## Scope and non-negotiable rules

Use this draft for a reported browser reset, lost or inaccessible authenticator, suspected credential compromise, or suspected POS-device compromise. Admins may manage tenant devices; Supervisors may manage only devices in their assigned branch. The backend remains authoritative for authorization and branch scope.

- Never recover, export, copy, or request a WebAuthn private key. Recovery creates a new credential.
- Never send pairing authorization, cashier login attempts, passwords, assertions, HMAC secrets, or private credential material in a URL, ticket, chat, email, analytics event, log, or persistent browser storage.
- Pair only in the specifically approved target POS browser after independently confirming the device asset and branch. A browser confirmation, AAGUID, attachment value, or backup flag does not prove physical-register identity.
- Never fall back from `WEBAUTHN` to HMAC. `UNPAIRED` accepts neither proof; `HMAC_LEGACY` may use only its separately approved legacy HMAC path during an approved migration window.
- Do not directly edit device, credential, challenge, session, or audit rows in the database. Do not reactivate a device or restore access by bypassing backend validation.
- Preserve relevant incident evidence before destructive action. Record only non-secret identifiers and audit references.

## Lost credential or browser reset; device remains controlled

This path is for a device that remains physically controlled and is still active, where its current authenticator credential is lost, inaccessible, or suspected compromised.

1. Verify the requester and confirm the device ID, branch, and physical asset against the approved inventory process. If inventory or ownership cannot be verified, stop and escalate; do not pair.
2. An authorized Admin, or a Supervisor acting within their own branch, inspects the device and active credential metadata in Admin → Devices / Supervisor → Devices. Do not copy the credential's public identifier or AAGUID into an unapproved external system.
3. Revoke the affected credential through the device-management workflow. This revokes sessions bound to that credential. Record the actor, device, credential-row identifier, time, reason, and resulting audit reference; do not record a bearer token or assertion.
4. On the verified target POS browser, start “Replace credential / re-pair” and complete a fresh WebAuthn registration. The pairing authorization is short-lived, single-use, kept in application memory, and exchanged only in the completion request body. Do not transfer it to the cashier or an administrator workstation.
5. Confirm that the server reports the replacement credential active and the device remains in `WEBAUTHN` mode. Confirm that old sessions are no longer usable and that the audit trail contains the revocation and re-pair events. If any check fails, keep the POS out of service and escalate.
6. Do not claim that this process proves hardware backing, non-exportability, non-syncability, or a specific physical register. Those claims require the separate real-device qualification and policy approvals.

## Suspected lost, stolen, or compromised POS device

1. Preserve incident evidence and notify Security and Operations using the approved incident channel. Do not include secrets or WebAuthn response payloads in the incident record.
2. An authorized Admin, or an in-branch Supervisor, deactivates the device through the device-management workflow. Device deactivation revokes its active sessions. Revoke any credential believed compromised and record the corresponding audit references.
3. Keep the device inactive and unavailable for cashier work while ownership, containment, and replacement are reviewed. Do not reactivate a WebAuthn device without an active credential and successful backend validation.
4. If a replacement physical device is authorized, provision it as a new device and complete the approved pairing procedure on that target. Do not move or restore the old credential as a substitute for device identity.
5. If the device is inactive and has no active credential, or the UI/API does not provide an approved recovery path, stop. Do not use direct database writes, bypass the qualification gate, or switch the device to HMAC. Escalate to Engineering, Security, and Operations for a reviewed forward-safe recovery plan.

## HMAC_LEGACY devices during an approved migration window

This section is conditional and inactive until the legacy-device inventory, migration window, and responsible Security/Operations approvals are documented. Only an individually inventoried `HMAC_LEGACY` device may use its existing HMAC proof during that window. `WEBAUTHN` must never accept an HMAC proof, and `UNPAIRED` must accept neither proof. Do not rotate, disclose, retire, or re-create a legacy secret outside the approved per-device procedure. Do not remove the HMAC path, KEK, fields, or migration utilities until the approved cutover and rollback criteria pass and the contract migration has a backup/restore plan.

## Evidence and escalation

Record the incident/change reference, actor and role, tenant/branch/device identifiers, affected credential-row identifier, timestamps, reason, outcomes of session checks, and audit-event references. Keep evidence in the approved restricted system. Exclude passwords, pairing/attempt tokens, private keys, raw HMAC secrets, WebAuthn assertions, and unredacted customer data.

Escalate immediately if scope is unclear, the device cannot be independently identified, a credential remains active after revocation, a session remains usable after deactivation, a new credential cannot be enrolled, or the server reports an unqualified/unsupported authenticator. Keep production use blocked until the qualification register is complete and signed.

## Required approval before operational use

- Security approver and decision: ____________________
- Operations owner and decision: ____________________
- Approved pilot/production scope: ____________________
- Tabletop exercise reference and date: ____________________
- Evidence and audit-retention location: ____________________
