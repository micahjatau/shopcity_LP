Yes. At this point we should stop treating them as three unrelated backlogs. They overlap enough that the cleanest move is a **single frontend stabilization program** with three coordinated tracks and one release gate.

## The three active problem areas

| Track                      | Main problem                                                                              |                         Current risk | Priority |
| -------------------------- | ----------------------------------------------------------------------------------------- | -----------------------------------: | -------: |
| **A. Repo-review closure** | Correctness/security/backend-utilization gaps                                             | Can produce wrong or unsafe behavior |   **P0** |
| **B. Performance**         | ~478 KB route responses, duplicated shell/config work, possible network topology latency  |       Makes every workflow feel slow |   **P1** |
| **C. Cashier UX**          | Too much diagnostic/context information, weak task hierarchy, oversized workflow surfaces |      Makes the product harder to use |   **P1** |

The important point is that **B and C should largely be implemented together**.

The Cashier pages that are visually overloaded are also some of the largest client components contributing to the performance problem.

---

# A. Close correctness/security first

These should be treated as **release blockers**, even while the UX/performance refactor is underway.

| Issue                                                | Action                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| Device attestation secret stored in `localStorage`   | Remove persistent raw-secret storage; introduce proper POS provisioning behavior |
| Customer `?id=` selection race                       | Preserve route-selected customer instead of letting initial search overwrite it  |
| Customer registration missing                        | Expose existing `POST /customers` to Supervisor/Admin                            |
| Customer profile editing missing                     | Expose existing `PATCH /customers/:id`                                           |
| Shared Transaction workspace links to `/supervisor`  | Remove role-specific navigation from shared workflow                             |
| Customers/Cards nearly identical                     | Separate workflow intent or introduce explicit workspace modes                   |
| Device provisioning response treated as generic JSON | Present secret once, copy securely, then clear it                                |
| Remaining page-local route maps                      | Remove now that the sidebar is canonical                                         |
| Duplicate Vercel project failure                     | Remove or disconnect stale deployment context                                    |
| Exact-head CI                                        | Require green evidence before release                                            |

These are mostly **bounded fixes**. They should not trigger another architecture redesign.

---

# B + C. Combine Cashier UX and payload reduction

This is where I would make one deliberate refactor rather than two separate passes.

The current structure is roughly:

```text
Cashier route
   ↓
large client component
   ↓
session
config
lookup
policy
customer
ledger
workflow
offline
navigation helpers
```

We want:

```text
Shared shell/provider
│
├── session
├── branch
├── device
└── cached policy
        ↓
focused route
        ↓
small interactive workflow component
```

That improves **both UX hierarchy and performance**.

### `/cashier`

Reduce it to:

```text
Cashier overview

Main Branch · POS-03 · Online

[ Earn credit ]
[ Redeem credit ]
[ Find customer ]

2 transactions waiting to sync
View queue →

Recent activity
```

Remove:

- embedded detailed lookup;
- full policy card;
- user UUID;
- duplicated connection widgets;
- developer-facing explanations;
- duplicate navigation.

### `/cashier/lookup`

Make lookup the primary task:

```text
Scan / enter card

        ↓

Ada Shopper
ACTIVE
Balance ₦8,500

[ Earn ] [ Redeem ] [ Customer ]
```

No full policy dashboard.

### `/cashier/earn`

```text
Customer/card

Purchase amount

Expected credit ₦500
2% earn rate

[ Review transaction ]
```

Only show policy values relevant to **this Earn transaction**.

### `/cashier/redeem`

```text
Customer/card
Available ₦8,500

Basket ₦20,000
Maximum redemption ₦6,000

[ Review redemption ]
```

Again, contextual policy rather than configuration-table UI.

---

# Performance architecture to implement underneath that

The shell layout already exists, so I would **not** spend time merely moving JSX into another layout.

The real changes are:

### Shared application context

Create a provider above routes containing:

```text
session
user
role
branch
device
tenant
policies
```

Then eliminate route-level:

```text
useSessionBootstrapState()
GET /auth/me
GET /config/public
```

where the same data is already available from the shell.

Normal route changes should cause:

```text
/auth/me        0 requests
/config/public  0 requests
```

---

### Cache public configuration

`/config/public` should be:

```text
initial request
      ↓
cache
      ↓
reuse across routes
```

A sensible starting policy would be approximately:

```text
5-minute freshness
30-minute stale-while-revalidate
```

with explicit invalidation after policy/branch changes if practical.

The exact cache key must still respect tenant/branch scope.

---

### Reduce client boundaries

Biggest candidates:

```text
cashier/page.tsx
cashier-transaction-route.tsx
customer-workspace.tsx
cashier/sync/page.tsx
```

Don't convert everything to server components merely for the label.

Instead separate:

```text
static composition
        +
small interactive islands
```

For example:

```text
CashierEarnPage
├── PageHeader
├── CustomerContextSummary
├── EarnPolicySummary
└── EarnTransactionForm  ← client interaction
```

This should materially reduce both RSC and hydration payload.

---

# Performance measurement comes before and after the refactor

We need to stop relying on one “478 KB” number without knowing exactly what it represents.

Record for:

```text
/cashier
/cashier/lookup
/cashier/earn
/cashier/redeem
/supervisor/approvals
/admin/operations
```

at least:

| Metric                 | Why                     |
| ---------------------- | ----------------------- |
| HTML/document bytes    | initial page cost       |
| RSC transfer           | navigation payload      |
| JS transfer            | hydration/runtime cost  |
| TTFB                   | server/network          |
| FCP/LCP                | perceived load          |
| INP                    | interaction             |
| `/auth/me` count       | duplicated session work |
| `/config/public` count | duplicated config work  |
| total API count        | waterfall               |
| hydration duration     | client cost             |

Use a production build:

```bash
npm --prefix apps/web run build
npm --prefix apps/web run start
```

not `next dev`.

### Initial performance targets

I'd set:

```text
Warm navigation payload     <150 KB
Stretch target              <100 KB

/auth/me on route change     0
/config/public warm          0
duplicate API calls          0

Warm route usable           <500 ms
API TTFB same-region        <200–300 ms
LCP                          <2.5 s
INP                          <200 ms
```

The immediate payload milestone should be roughly:

> **478 KB → below 150 KB**

before chasing smaller optimizations.

---

# Infrastructure should be checked in parallel

There's still:

```text
Browser
  ↓
Next /api/v1 proxy
  ↓
Backend
  ↓
Supabase/Postgres
```

If those are spread across regions, frontend optimization alone won't solve perceived slowness.

The topology investigation should establish:

```text
Supabase/Postgres region
Backend region
Vercel Next/function region
```

Then preferably:

```text
Backend ≈ database region
Next API proxy ≈ backend region
```

The database-to-backend hop deserves priority because virtually every meaningful transaction depends on it.

---

# Unified execution order

I would execute the work like this:

1. **Baseline performance**

   - production build;
   - timings;
   - request waterfall;
   - exact route-size measurements.

2. **Correctness/security blockers**

   - device-secret storage;
   - customer deep-link race;
   - customer create/edit;
   - shared-workspace role leakage.

3. **Centralize shell state**

   - one session source;
   - one config source;
   - no route refetches.

4. **Cache public configuration.**

5. **Refactor Cashier Overview + Lookup**

   - simultaneously reduce client/component footprint.

6. **Refactor Earn + Redeem**

   - focused transaction surfaces;
   - contextual policy;
   - smaller client boundaries.

7. **Refactor Sync + Customer workspace**

   - decompose the remaining oversized client modules.

8. **Finish general UI cleanup**

   - remove page-local navigation;
   - Customer/Card differentiation;
   - compact topbar;
   - actual device context.

9. **Fix infrastructure placement**

   - or earlier if baseline shows huge backend RTT.

10. **Run real shell visual/performance/E2E regression gates.**

11. **Exact-head CI + canonical Vercel deployment green.**

12. **Reconcile OpenSpec/review documents and close the program.**

---

## I would create one umbrella change

Rather than another series of `repo-review-55`, `repo-review-56`, etc., I'd create something like:

### **`frontend-stabilization-and-performance`**

with three workstreams:

```text
A — Correctness & security
B — Cashier workflow UX
C — Performance & deployment
```

and one shared acceptance gate:

```text
Correct workflows
        +
No P0/P1 security defects
        +
Cashier hierarchy approved
        +
<150 KB warm route target
        +
zero duplicate session/config fetches
        +
real device-bound login
        +
real E2E
        +
production deployment green
```

That gives us a **single definition of “frontend ready”** instead of continuously fixing one class of issue and rediscovering another in the next review.

At this point I would treat **correctness/security as the gate**, then make **Cashier UX + performance the main implementation sprint**, because those two are now largely the same technical refactor.
