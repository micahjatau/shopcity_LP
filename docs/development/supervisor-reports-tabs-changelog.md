# Supervisor reports tabs: presentation changelog

The report page now groups the existing experience into URL-addressable **Overview**, **Insights**, and **Reports** tabs. The shared reporting component also serves Admin reports, so the tab framing is shared while role-specific scope and capabilities remain unchanged.

## Tab changes

| Tab      | Contents                                                                            | Before → after                                                                                                                                                                                              |
| -------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview | KPI cards and their definitions, period context, freshness, and scope               | “Branch at a glance” with metric tiles → a scan-friendly operational overview. Customer counts use integer formatting; financial values remain NGN.                                                         |
| Insights | Daily trend, selected-category summaries, and category-specific issues              | “Daily activity” / “Operational summary” → “Insights” with existing explanatory copy and scope context.                                                                                                     |
| Reports  | Existing report selector, result review, pagination, export, and authorized actions | “Generate reports” embedded below the dashboard → the dedicated “Reports” section. Workspace mounts on first visit and stays mounted thereafter to preserve selection and result state when switching tabs. |

The date-range and (Admin-only) scope controls remain available across tabs. Tab selection is reflected in the `tab` query parameter (`overview` is the default); back/forward navigation is supported. No app-shell, API, authorization, calculation, or export behavior was intentionally changed.

## Field presentation inventory

- Executive summary: report date; registered and active customer counts; transaction count; loyalty purchase value; credit issued, redeemed, expired; outstanding credit.
- Cashier activity: cashier and report date; transaction count; purchase value; credit issued; redemption count/value; duplicate attempts; reversals; approval requests; fraud flags.
- Redemption summary: report date; redemption count; requested, confirmed, and reversed value; pending approval count; lots consumed; allocations; ending balance; approved, rejected, and expired approvals.
- SMS operations: report date; total, queued, sent, delivered, failed, suppressed, retry, and dead-letter message counts; cost status.

Count fields should display as whole-number counts; Kobo-valued fields should display as NGN. The shared technical-detail label dictionary now names the report date, materialization time, common operational counts, and value fields in plain language; timestamps and IDs remain contextual details, not headline metrics. CSV export allowlists are not a complete API contract: report list methods serialize persisted rows, and responses may include fields beyond those inventoried above. Raw scope keys, internal row IDs, tenant identifiers, and fields without a confirmed user-facing purpose remain technical or unmapped rather than being guessed at.

## Wording requiring domain confirmation

- **Basket ratio (`basketRatioBps`)**: excluded from user-facing headline wording. The materializer computes confirmed redemption value × 10,000 / basket value, but the business meaning of “basket,” intended aggregation, and percentage interpretation need domain-owner confirmation.
- **Pending approvals**: daily aggregate counts are not necessarily the number of currently open cases.
- **Fraud flags**: a flag count does not imply open or confirmed fraud cases.
- **SMS sent**: means submitted to the provider, not delivered to the customer. `costStatus` is not a monetary cost amount.
- **Active customers and outstanding credit**: latest available snapshots, not period sums. Loyalty purchase value describes ShopCity loyalty activity, not total POS sales.

## Acceptance notes

Automated unit coverage was added for query-backed tabs, switching to Reports, and retaining the report workspace after navigating away. Live visual acceptance with an authorized Supervisor session and populated real branch data remains blocked; deterministic local fixtures do not replace that acceptance step.
