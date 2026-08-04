# Receipt Quarantine Runbook

## Purpose
Review duplicate physical-receipt identities without deleting shared data automatically.

## Steps
1. Run `report-duplicate-legacy-receipts.sql` to generate the duplicate report for the target tenant, branch, and receipt-week range.
2. Create a quarantine batch record in `ReceiptLegacyIdentityQuarantineBatch` with the incident/reference ID, creator, and notes.
3. Review the report and insert the approved IDs and any reconciliation plans into `ReceiptLegacyIdentityQuarantineApproval` for that batch.
4. Mark the batch approved with the approver and approval timestamp.
5. Replace `__BATCH_ID__` in `stage-approved-receipt-quarantine.sql` with the approved batch ID to copy only approved duplicate IDs for that batch into the staging table.
6. Replace `__BATCH_ID__` in `execute-approved-receipt-quarantine.sql` with the staged batch ID to quarantine and delete only staged rows for that batch.
7. Verify the removed rows and related financial evidence before closing the incident.

## Rules
- Do not delete duplicate rows just because they rank after the first record.
- Do not run remediation without an explicit approved-ID list.
- Keep the report step separate from the destructive step.
- Attach a reconciliation plan before deleting any duplicate row that has dependent confirmed financial records.
- Keep each remediation tied to exactly one batch ID.
