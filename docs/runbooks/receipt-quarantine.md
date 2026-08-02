# Receipt Quarantine Runbook

## Purpose
Review duplicate physical-receipt identities without deleting shared data automatically.

## Steps
1. Run `report-duplicate-legacy-receipts.sql` to generate the duplicate report for the target tenant, branch, and receipt-week range.
2. Review the report and decide which receipt IDs are approved for quarantine or deletion.
3. Insert the approved IDs and any reconciliation plans into `ReceiptLegacyIdentityQuarantineApproval`.
4. Run `stage-approved-receipt-quarantine.sql` to copy only approved duplicate IDs into the staging table.
5. Run `execute-approved-receipt-quarantine.sql` to quarantine and delete only staged rows.
6. Verify the removed rows and related financial evidence before closing the incident.

## Rules
- Do not delete duplicate rows just because they rank after the first record.
- Do not run remediation without an explicit approved-ID list.
- Keep the report step separate from the destructive step.
- Attach a reconciliation plan before deleting any duplicate row that has dependent confirmed financial records.
