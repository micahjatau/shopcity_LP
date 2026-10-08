# POS WebAuthn Qualification and Production Gate

**Status: NOT QUALIFIED — production NO-GO.** This register records known gaps; it is not evidence that any device, authenticator, policy, or fallback has passed qualification. The proposed WebAuthn profile and managed-device alternative remain proposals, not approvals. OpenSpec tasks 1.1–1.3 remain incomplete; task 1.4 records this hard production gate and fallback.

## Evidence register

| Evidence area                                           | Current evidence / status                                                                                                                                                     | Evidence required to close                                                                                                                                                            | Responsible owner    | Reviewer / sign-off  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------- |
| POS fleet and supported combinations                    | TRD describes browser-enabled POS computers and USB scanners. Exact hardware, OS, browsers, and authenticators are not inventoried.                                           | Dated inventory of each supported POS model, OS/version, browser/version and management mode, authenticator model/type, and tested combinations; identify unsupported combinations.   | ____________________ | ____________________ |
| Managed-browser and device policy                       | No managed-browser policy evidence is recorded.                                                                                                                               | Approved policy and configuration evidence for browser management, authenticator use, updates, and enforcement on each supported combination.                                         | ____________________ | ____________________ |
| WebAuthn profile and origin                             | Platform UV-required, resident key discouraged, and direct-attestation settings are proposed, not approved or qualified. Exact RP ID and allowed origins are not established. | Security-approved profile; exact RP ID and HTTPS origin allowlist per environment; proof from each real deployment configuration that those exact values are used and enforced.       | ____________________ | ____________________ |
| Attestation and trust roots                             | Trust-root validation and accepted attestation policy are absent.                                                                                                             | Approved attestation formats, validation procedure, trust-root source/maintenance, rejection behavior, and recorded verification results for each supported combination.              | ____________________ | ____________________ |
| Hardware-backed, non-exportable, non-syncable assurance | No real-device evidence is recorded. Attachment, AAGUID, and backup flags alone do not establish hardware backing, non-exportability, or non-syncability.                     | Reproducible real-device test evidence demonstrating the required key properties and how evidence is validated; document limits and failure behavior for every supported combination. | ____________________ | ____________________ |
| Backup, privacy, and retention                          | Backup/attestation approval and retention boundaries are absent.                                                                                                              | Security/privacy approval of backup eligibility/state handling, attestation collection, purpose, access, retention period, deletion, and audit controls.                              | ____________________ | ____________________ |
| Alternative register identity                           | A managed-device certificate/agent is a proposed fallback only; it is not selected or qualified.                                                                              | If needed, approved design plus real-device evidence for enrollment, key protection, device-to-register binding, revocation/recovery, management enforcement, and failure handling.   | ____________________ | ____________________ |
| Credential recovery and revocation                      | `docs/runbooks/pos-device-credential-recovery.md` is a draft only; no recovery policy or tabletop approval is recorded.                                                       | Security/Operations approval, scoped authority, auditable revocation/re-pair evidence, failed-recovery handling, and a documented tabletop exercise before pilot or production use.   | ____________________ | ____________________ |
| Assurance claims                                        | No formal NIST AAL3 claim is established; the design explicitly disclaims such a claim.                                                                                       | Approved, evidence-bounded customer/security wording and review of every proposed assurance claim. Do not claim AAL3 or equivalent certification without its own substantiation.      | ____________________ | ____________________ |

Attach or link dated test reports, policy approvals, configuration exports, and reviewer decisions to each evidence row when available. Record the exact device/software versions and test result; a setting or metadata field alone is not qualification evidence.

## Production go/no-go gate

**Current decision: NO-GO for production use as register-bound WebAuthn.** Do not enable production rollout or cutover on the basis of this register, the proposed option values, browser virtual-authenticator tests, `authenticatorAttachment`, AAGUID, or backup flags alone.

Change this decision only after all of the following are documented and signed by the responsible security approver:

1. The supported POS hardware/OS/browser/authenticator inventory and managed-browser policy are complete and approved.
2. Exact RP ID, HTTPS origins, WebAuthn profile, attestation verification and trust roots are approved and demonstrated on every supported combination.
3. Real-device evidence shows hardware backing, non-exportability, and non-syncability to the standard required for register identity; backup and attestation handling, privacy, and retention are approved.
4. Unsupported devices and failed/missing evidence fail closed and cannot be represented as qualified register-bound devices.
5. Security has approved the resulting assurance statement and operational recovery/revocation controls.

If the target fleet cannot meet or demonstrate the register-identity standard, **do not treat generic or synced WebAuthn credentials as register identity**. A managed-device certificate/agent may be considered only after it is explicitly selected, approved, and qualified against documented criteria for device binding, key protection, management enforcement, revocation/recovery, and failure behavior. Until then, this alternative is not an approved production fallback; keep the production gate NO-GO.

No customer-facing or internal security claim that POS keys are hardware-backed, non-exportable, non-syncable, or that the deployment achieves AAL3 may be made without evidence supporting that exact claim and security approval.

## Decision and sign-off

- Qualification decision: **NO-GO pending evidence and security approval**
- Decision date: ____________________
- Security approver (name/title): ____________________
- Security approver signature: ____________________
- Operations owner / sign-off: ____________________
- Approved scope (device/software combinations): ____________________
- Evidence record / approval references: ____________________
