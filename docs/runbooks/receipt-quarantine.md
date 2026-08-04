# Receipt Quarantine Runbook

## Purpose

Review duplicate physical-receipt identities without deleting shared data automatically.

## Steps

1. Run `report-duplicate-legacy-receipts.sql` to generate the duplicate report for the target tenant, branch, and receipt-week range.
2. Create a quarantine batch record in `ReceiptLegacyIdentityQuarantineBatch` with the incident/reference ID, creator, and notes.
3. Review the report and insert the approved IDs and any reconciliation plans into `ReceiptLegacyIdentityQuarantineApproval` for that batch.
4. Record the approver, approval reason, and approval timestamp on each approved receipt row or on the batch record before staging.
5. Replace `__BATCH_ID__` in `stage-approved-receipt-quarantine.sql` with the approved batch ID to copy only approved duplicate IDs for that batch into the staging table.
6. Replace `__BATCH_ID__`, `__EXECUTED_BY__`, `__INCIDENT_REFERENCE_ID__`, and `__APPROVAL_REASON__` in `execute-approved-receipt-quarantine.sql` before quarantine execution so the destructive step is attributable to an explicit operator and incident.
7. Verify the removed rows and related financial evidence before closing the incident.

## Rules

- Do not delete duplicate rows just because they rank after the first record.
- Do not run remediation without an explicit approved-ID list.
- Keep the report step separate from the destructive step.
- Attach a reconciliation plan before deleting any duplicate row that has dependent confirmed financial records.
- Keep each remediation tied to exactly one batch ID.
- Do not run the destructive step with placeholder operator, incident, or approval values.
