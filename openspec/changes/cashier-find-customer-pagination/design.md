# Design: Cashier Find Customer pagination

## Context

The Cashier shell's Find Customer route is `/cashier/lookup`, rendered by `CashierWorkflowRoute` and `FindCustomerView` in `apps/web/components/workflows/cashier-transaction-route.tsx`. It currently fetches one bounded page of recent customers and one bounded page of directory matches. The authenticated customer list API already returns `items`, `nextCursor`, and `hasMore`; pagination can remain frontend-only.

## Decisions

1. **Use the existing cursor contract.** Keep the current request limits (10 recent customers, 8 directory matches), send the API's opaque cursor unchanged, and maintain a cursor history so Previous returns to the correct server page. Do not infer totals from a bounded page.
2. **Keep list modes independent.** Recent customers retain their own cursor stack. Search results reset their page/cursor history for each new lookup. A verified-card result is a single verified customer and has no directory pager.
3. **Keep failures truthful.** During page navigation, retain the currently displayed rows. On failure, expose an inline retry for the failed destination; only replace rows and page state after a successful response. Disable controls while their list is loading.
4. **Preserve the financial boundary.** Pagination only changes which customer summaries are displayed. Search discovery remains read-only; exact active-card lookup still gates Earn and Redeem.
5. **Reuse cashier pagination affordances.** Use `ChevronLeft` and `ChevronRight` from `lucide-react`, `size={16}`, with `aria-hidden`, matching `transaction-dashboard.tsx`. Reuse its existing `transaction-pagination*` CSS classes rather than introducing a second visual treatment.

## Affected surface

- `apps/web/components/workflows/cashier-transaction-route.tsx`
- `apps/web/components/workflows/use-cashier-lookup-controller.ts`
- `apps/web/tests/cashier-lookup.spec.tsx`
- `apps/web/tests/workflow-routes.spec.ts` (route/visual coverage as appropriate)

No backend, database, OpenAPI, or generated-client changes are planned.

## Risks and verification

The lookup hook is shared by Cashier Lookup, Earn, and Redeem. Keep its added pagination state additive and preserve card verification behavior; run the focused lookup tests plus existing Earn/Redeem workflow coverage. Verify that cursors reset on a new search, stale requests cannot replace newer results, and failures do not erase the current page. Check the icon controls at desktop and narrow viewport widths.
