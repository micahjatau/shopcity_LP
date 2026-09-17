# Role and scope acceptance fixtures

These fixtures define the minimum acceptance matrix for frontend and backend workflow tests. Every fixture must assert both the HTTP outcome and the absence of unauthorized UI controls.

| Fixture                       | Role                     | Tenant       | Branch                       | Device                    | Expected boundary                                                                                            |
| ----------------------------- | ------------------------ | ------------ | ---------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `cashier-active-device`       | Cashier                  | `tenant-a`   | `branch-a`                   | Active device on branch A | Lookup and financial actions only for verified branch-A context; no customer registration or policy mutation |
| `cashier-wrong-branch-device` | Cashier                  | `tenant-a`   | `branch-a`                   | Device on branch B        | Reject device/card context mismatch; no submit                                                               |
| `cashier-no-device`           | Cashier                  | `tenant-a`   | `branch-a`                   | None                      | Session-required/offline-disabled boundary; no financial submit                                              |
| `supervisor-branch-a`         | Supervisor               | `tenant-a`   | `branch-a`                   | Active device             | Customer/card lifecycle and approvals for permitted scope; no policy mutation                                |
| `admin-tenant-a`              | Admin                    | `tenant-a`   | Optional branch context      | Active or none            | Tenant-scoped administration and branch policy mutation                                                      |
| `admin-wrong-tenant-branch`   | Admin                    | `tenant-a`   | `branch-z` owned by tenant B | Active                    | 404/forbidden scope rejection; no data leakage                                                               |
| `expired-session`             | Any human role           | Any          | Any                          | Any                       | Clear verified card/session state and route to login/recovery                                                |
| `blocked-card`                | Cashier/Supervisor/Admin | Tenant-owned | In-scope                     | Active                    | Display authoritative blocked state; reject Earn/Redeem                                                      |
| `staff-customer`              | Cashier/Supervisor/Admin | Tenant-owned | In-scope                     | Active                    | Display authoritative staff/ineligible state; reject financial action                                        |

Client-submitted role, balance, eligibility, branch, device, and policy fields are test fixtures only and must never be trusted by production handlers.
