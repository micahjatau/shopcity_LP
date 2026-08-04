# Rollback Checklist

- [ ] Stop the protected release-evidence workflow.
- [ ] Leave the release SHA unchanged until a matching evidence bundle exists.
- [ ] Preserve the backup artifact reference used for the run.
- [ ] Revert only the workflow/documentation changes if evidence generation fails.
- [ ] Do not re-enable reversal or manual adjustment execution while the release remains incomplete.
- [ ] Record the rollback reason in Issue #1.
