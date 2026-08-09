Updated review: micahjatau/shopcity_LP

Executive verdict

The latest changes resolve the primary migration concern from the previous review.

The repository now has a genuine populated-schema upgrade test, and blank legacy POS references are rejected rather than converted into empty receipt identities. The latest runtime-relevant commit is 23cd0c9 — fix: verify receipt migration upgrade; d9707ef only formats that test.

> Decision: proceed with immutable ledger development.

For a populated shared database, add one final duplicate-legacy-receipt preflight before deploying the receipt migration.

---

What is now correct

1. Blank legacy references are handled safely

The migration now:

Trims externalReceiptNumber with BTRIM.

Rejects NULL.

Rejects empty or whitespace-only values.

Backfills the real physical receipt number.

Removes obsolete receipt columns.

This closes the previous blank-reference defect.

2. The upgrade test uses an authentic old-schema path

The new integration test:

1. Copies the migration history without the receipt-integrity migration.

2. Applies that pre-change history to PostgreSQL.

3. Inserts a receipt using the old receiptNumber and externalReceiptNumber fields.

4. Applies the patched migration.

5. Confirms the physical POS reference survives.

6. Confirms receiptNumber, externalReceiptNumber and cashierId are removed.

The negative path also verifies that a migration containing whitespace and null receipt references fails.

3. The test is wired into CI

The integration configuration includes every .int-spec.ts file, and the CI workflow executes npm run test:integration.

The migration tracker now records the upgrade-path verification as completed in Testcontainers.

No status checks or PR workflow runs are visible for the latest commit through the connected GitHub data, so I could not independently confirm a remote green run.

---

Remaining migration risk

P0 for populated databases: duplicate historical POS references

The old migration added externalReceiptNumber without a uniqueness constraint. Its indexes covered tenant identity, branch/week queries, card/time and captured-by fields, but not the printed POS reference.

Therefore, legacy data could contain:

Old generated receipt UUID A → POS-1042
Old generated receipt UUID B → POS-1042

The patched migration creates the new normalized uniqueness index only at the end, after dropping the legacy columns.

The deployment will fail if duplicate physical references exist in the same tenant, branch and receipt week.

Required preflight

Add a guard before modifying or dropping anything:

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Receipt"
    WHERE "externalReceiptNumber" IS NOT NULL
      AND BTRIM("externalReceiptNumber") <> ''
    GROUP BY
      "tenantId",
      "branchId",
      "receiptWeekStart",
      UPPER(BTRIM("externalReceiptNumber"))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate legacy POS receipt identities require resolution';
  END IF;
END $$;

Also add an upgrade test containing two different generated receipt UUIDs with the same normalized external receipt number.

For a database with no existing receipts, this risk does not apply.

---

Test-harness issue before adding ledger migrations

The upgrade-test helper copies every migration except the target migration:

for (const entry of readdirSync(migrationsRoot).sort()) {
if (entry === migrationName) {
continue;
}

// copy migration
}

Once a later ledger migration is added, the test will attempt to apply that later migration before the receipt-integrity migration. It may fail because of missing tables, fields or constraints.

Change it to copy only migrations preceding the target:

for (const entry of readdirSync(migrationsRoot).sort()) {
if (entry === migrationName) {
break;
}

// copy preceding migration
}

This should be corrected before the first ledger migration lands.

---

Migration sequencing improvement

The migration currently updates receipt values before checking for invalid legacy references.

Reorder it to:

1. Check null and whitespace references.

2. Check normalized duplicates.

3. Only then rename, backfill and drop columns.

That ensures validation fails before any data mutation, independent of migration transaction behaviour.

The negative integration test should also test null and whitespace separately and verify the expected database error, rather than accepting any generic command failure.

---

Financial-integrity issues to fix during the ledger phase

1. Eligibility checks occur outside the transaction

Device, branch, card and customer eligibility are checked before the Prisma transaction begins.

The transaction currently begins only when creating the idempotency record and receipt.

Once money is awarded, the following must occur atomically:

Revalidate card/customer/device/branch
Create receipt
Create immutable ledger entry
Create credit lot
Create audit records
Create notification outbox record

Otherwise, a card or device could be disabled between validation and credit creation.

2. Concurrent receipt capture is not directly tested

Current duplicate tests are sequential: the first request completes before the second starts.

Before receipt capture generates credit, add a simultaneous test:

const results = await Promise.allSettled([
postReceipt(body, cashierA, 'concurrent-a'),
postReceipt(body, cashierB, 'concurrent-b'),
]);

Required outcome:

One successful receipt
One conflict
One ledger earn entry
One credit lot

3. High-value purchase rules are not implemented

Configuration defines:

₦100,000 flag threshold.

₦200,000 approval threshold.

The receipt service only reads the approval threshold and hard-rejects anything above it.

The current behaviour is:

Purchase Current result

Up to ₦200,000 Captured normally
Above ₦200,000 Rejected for every role
₦100,001–₦200,000 Not specially flagged

The intended workflow still needs:

FLAGGED state above ₦100,000.

PENDING_APPROVAL above ₦200,000.

Supervisor approval record.

Separate requesting and approving actors.

Credit awarded only after approval.

4. Device history can still be erased

Receipt.deviceId remains optional, and deleting a device sets the historical receipt reference to null.

For financial history:

Use ON DELETE RESTRICT.

Retire devices through status changes.

Bind sessions to registered devices.

Derive device identity from the session rather than trusting a body-supplied UUID.

5. Idempotency remains provisional

IdempotencyRecord still has no tenant relationship or actor foreign key. It has PENDING, COMPLETED and expiresAt, but receipt capture creates it directly as completed and no cleanup lifecycle is visible.

Before redemption or adjustments use it:

Add tenantId.

Add a composite user relationship.

Enforce expiry.

Implement cleanup.

Decide whether a real pending lifecycle is needed.

Replay the complete receipt-and-earn response.

---

API contract issue

The session guard accepts bearer authentication or a session cookie.

The receipt endpoint advertises bearer authentication.

However, every unsafe request still requires both a CSRF cookie and matching header, including bearer-authenticated requests.

Choose a clear contract:

Cookie authentication → require CSRF.

Bearer authentication → skip CSRF.

Support both → branch the CSRF guard based on the authentication method.

This should be fixed before mobile or independently generated API clients are introduced.

OpenAPI errors also remain generic: every status uses examples resembling 400 VALIDATION_ERROR, including 401, 409 and 503 responses.

---

Redis verification remains incomplete

The Redis integration test proves initial fail-closed behaviour when Redis cannot be reached.

It still does not prove:

Redis available
→ Redis stops
→ requests fail closed
→ Redis restarts
→ application recovers without restart

That test should remain on the pre-production checklist.

---

Product completeness

The active application still contains only the foundation modules; the loyalty module is not imported.

The loyalty module itself remains empty.

There is still no queue dependency for SMS, expiry processing, reconciliation or retry handling.

The platform still cannot:

Award 2% store credit.

Create expiry lots.

Reconstruct balances.

Redeem credit.

Reverse earnings.

Process purchase approvals.

Send SMS.

Report outstanding loyalty liability.

---

Updated maturity assessment

Area Score

Architecture 8.3/10
Receipt integrity 8.7/10
Migration verification 8.2/10
Test infrastructure 8.4/10
Financial transaction readiness 6.5/10
API contract maturity 6.5/10
Core loyalty functionality 2.5/10
Production readiness 5.2/10

Final decision

The main receipt migration blocker is closed. Start the immutable earning-ledger phase.

Before deploying against existing receipt data, add duplicate legacy-reference preflight. Before merging the first later migration, fix the upgrade-test harness so it copies only migrations preceding the receipt-integrity migration. The first ledger implementation should make receipt validation, earning, credit-lot creation and audit persistence one atomic operation.
