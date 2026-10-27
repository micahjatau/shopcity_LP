# Review-to-implementation traceability

This table maps review 73's recommendations to concrete delivery and acceptance. “Preserve” means no business requirement change is authorized. Planning coverage is not proof of implemented compliance.

| Review concern                                        | Design decision                                                                                                | Execution / tasks                         | Acceptance evidence                                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| Three competing styling layers                        | One source for tokens and one owner per shared component                                                       | P0 inventory; P1/P2 ownership; P8 cleanup | Static ownership negatives, direct route loads, final selector audit                       |
| Inconsistent six-page headers, buttons, cards, tables | Existing primitive variants plus thin ShopCity components                                                      | P2; P4–P7 migrations                      | Real-route canonical-value and cross-route computed styles                                 |
| Sync Queue gradients, radii and elevation             | Shared operational cards; preserve meaningful status styling                                                   | P7 / tasks 7.1–7.6                        | Derived Sync reference review and queue regression tests                                   |
| JSX composition versus CSS physical layout            | No static visual style objects; explicit layout classes                                                        | P2 checker; P4–P7                         | Static check over six routes and consumed presentation components                          |
| Generated token source must remain canonical          | Source/generator updates, compatible aliases, base-style extraction                                            | P1 / tasks 1.1–1.7                        | Determinism, unknown alias, cycle, contrast and consumer tests                             |
| Undefined success/warning variables                   | Valid named semantic/state tokens                                                                              | P1 / task 1.6                             | Token-reference failure fixtures; Overview state screenshots                               |
| Modular CSS rather than enormous globals              | Documented import order, shared components/shell/layouts, scoped legacy pages                                  | P1/P2/P3                                  | Dev/cold-route and production-build behavior; cascade regression checks                    |
| Product components missing above primitives           | Narrow controlled wrappers in existing shopcity layer                                                          | P2 / tasks 2.1–2.9                        | Native props/ref/semantics, accessibility and behavior-preserving wrapper tests            |
| Distinct page layouts                                 | Overview metrics, discovery layout, guided financial panels, data toolbar and queue operations remain separate | P4–P7                                     | Per-route screenshots and functional actions, not copied page templates                    |
| Workflow state geometry drift                         | One stable panel owner, shared controls, explicit width/state variants                                         | P5 / tasks 5.1–5.10                       | Paired state screenshots/styles plus draft/request/transition tests                        |
| Migrate incrementally                                 | Serial dependency graph with focused gates                                                                     | P0–P8                                     | Per-slice command exits, visual review and removable rollback units                        |
| No new local shared-control overrides                 | Shared variant API and scoped ownership checker                                                                | P2/P8                                     | Deliberate override fixture fails; no silent exceptions                                    |
| No broad global button or positional component rules  | Minimal resets only, explicit component classes                                                                | P1/P5                                     | Consumer audit, selector check, stable panel after sibling changes                         |
| No duplicated business logic                          | Protect controllers, generated clients, sessions, financial and queue contracts                                | All phases, especially P5/P7/P8           | Payload, idempotency, role, device, draft and queue regression tests; protected-path diff  |
| Conformance beyond screenshots                        | Expected values plus equivalence on real routes                                                                | P2/P8                                     | Focus/loading/disabled/invalid/read-only computed-style reports                            |
| Earn/Redeem paired state evidence                     | Actual-state mapping; do not invent discovery where unsupported                                                | P0/P5                                     | Idle/loading/error/verified-confirmation/details/review/outcome coverage with explicit N/A |
| Responsive desktop/tablet/phone                       | Fixed viewport matrix, contained tables, usable targets, drawer/modals                                         | P3–P8                                     | 1440/768/360/375/390 coverage plus changed breakpoint edges and reflow                     |
| Final commit SHA regression evidence                  | Revision-bound evidence; rerun after changes                                                                   | P8 / tasks 8.4–8.9                        | Final SHA/status, commands/exits, environment, reference provenance and reviewer decisions |

## Requirements mapped to phases

| Specification requirement                                               | Primary phases |
| ----------------------------------------------------------------------- | -------------- |
| Generated semantic tokens define operational appearance                 | P1             |
| Shared appearance has one CSS owner                                     | P1, P2, P4–P8  |
| Six pages share a visual language without identical layouts             | P2, P4–P7      |
| Financial workflow presentation remains consistent across states        | P5             |
| Search and financial authority are preserved                            | P3, P5, P6     |
| Modal and shell behavior survive shared presentation migration          | P2, P3, P6     |
| Offline and financial behavior remain unchanged                         | P5, P7, P8     |
| Shared dependency consumers retain compatibility                        | P1–P3, P8      |
| Static conformance prevents presentation drift                          | P1, P2, P8     |
| Equivalent controls are compared on real routes                         | P2, P4–P8      |
| Workflow state and responsive evidence are explicit                     | P0, P3–P8      |
| Visual references have explicit provenance                              | P0, P7, P8     |
| Conformance includes behavior accessibility and final revision evidence | P8             |

## Planning verification

- Strict OpenSpec validation passed for `unify-cashier-design-system`.
- OpenSpec reports all planning artifacts complete; this does not mark implementation tasks complete.
- Application tests, screenshots, accessibility scans and builds are scheduled implementation gates, not results of this documentation-only task.
- GitNexus proposal impact was executed and recorded in the repository tracker; implementation must repeat impact for actual edited symbols.
- Existing application changes and reference review documents were preserved.
