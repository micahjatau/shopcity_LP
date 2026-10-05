## Design Read

A Supervisor landing page for staff who need immediate orientation and obvious access to the workspaces they use. Match the cashier overview’s greeting-first hierarchy and restrained typography; use the shared shell as the navigation system rather than duplicating routes in page cards.

## Composition

Keep the existing centered `.supervisor-page` width and shared `CashierPageHeader` treatment. The header has one level-one heading, `Hi, Supervisor!`, and the existing cashier-style welcome line, `Welcome back to your dashboard`. Remove all overview body cards and panels; do not replace them with decorative tiles or fabricated metrics. Preserve `ScannerContextScope` with `lookup`, because it enables the shell’s existing scanner lookup utility rather than rendering an overview card.

## Boundaries

This change only alters `/supervisor` presentation and tests that incorrectly couple operational API workflows to that route. Approval review, fraud review, reports, customer management/registration, card tasks, and transaction review remain on their existing dedicated routes. Shared shell navigation, role checks, scanner behavior, and backend contracts remain unchanged.

## Verification

Assert the greeting and concise description, absence of route-launch cards and embedded operational panels on `/supervisor`, and preserve the dedicated approvals/fraud/report contract and smoke coverage. Verify existing responsive header width and accessibility behavior; run focused tests, typecheck, lint, and OpenSpec validation.
