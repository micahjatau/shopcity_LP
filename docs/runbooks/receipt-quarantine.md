# Receipt Quarantine Runbook

## Purpose
Review duplicate physical-receipt identities without deleting shared data automatically.

## Steps
1. Generate a read-only duplicate report for the target tenant, branch, and receipt-week range.
2. Review the duplicate group and decide which receipt IDs are approved for quarantine or deletion.
3. Stage only the approved receipt IDs in the remediation input.
4. Run the quarantine or delete step against the staged IDs only.
5. Verify the removed rows and related financial evidence before closing the incident.

## Rules
- Do not delete duplicate rows just because they rank after the first record.
- Do not run remediation without an explicit approved-ID list.
- Keep the report step separate from the destructive step.
