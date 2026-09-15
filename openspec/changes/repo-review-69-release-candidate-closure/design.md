# Design: Repo review 69 release-candidate closure

## 1. Business-day cutoff

Keep the existing report timezone configuration and date model, but centralize conversion from a local `reportDate` to its exclusive UTC cutoff. The conversion must account for the configured IANA timezone, including daylight-saving transitions, and must be used consistently by historical stock/liability and flow reconstruction. Prefer a tested timezone utility over string-appending `Z` to a local date.

Add boundary fixtures around midnight in `Africa/Lagos` (and a DST-observing timezone if supported by the utility). An event exactly before the exclusive cutoff is included; an event at or after it is excluded.

## 2. Branch SMS attribution

Extend the materializer’s source query/record shape to retain the relationship needed for card-linked SMS ownership. For branch scopes, resolve ownership in this order:

1. receipt branch for receipt-linked messages;
2. card/customer branch for card-linked replacement messages;
3. customer branch where the message contract supports customer-only notifications;
4. exclude unresolved ownership rather than guessing.

Tenant scopes remain unchanged. Keep the join bounded and avoid exposing message bodies or unmasked destinations. Add mixed fixtures proving a replacement message appears only in its owning branch and tenant-wide results contain it once.

## 3. Candidate lineage and deployment

Treat the current branch as a source of implementation fixes, not as a certification lineage. Reconcile it with current protected `master`, resolve conflicts explicitly, and run the complete repository verification contract on the resulting candidate. Record candidate SHA, merge base, workflow SHA, deployment IDs, and required-check results. Do not mutate the candidate after runtime evidence begins.

The API and worker are one release unit: both must report the exact candidate SHA. Worker evidence must show startup readiness and terminal outbox/provider state without credentials, cookies, provider payloads, or SMS contents.

## 4. Evidence gates and rollback

Run the existing certified runners for duplicate receipt, report isolation, worker/SMS lifecycle, and final readiness. Invalid fixtures, SHA mismatches, missing worker readiness, or incomplete provider evidence fail closed and are not reported as product passes. Preserve append-only evidence on rollback; roll back the API/worker pair together to the prior known candidate.
