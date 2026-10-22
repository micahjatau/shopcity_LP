## 1. Divider visibility

- [x] 1.1 Hide idle Supervisor transaction divider indicators and reveal them on resizable-heading/handle hover, focus, or active drag; the CSS is scoped to the Supervisor table and focused browser checks verify idle, hover, leave, and focus states.
- [x] 1.2 Add focused browser coverage for idle/hover/leave/focus visibility and retain the existing pointer/keyboard resize test; the focused Playwright check and 10-test dashboard Jest suite pass, including narrow-screen handle hiding.

## 2. Verification

- [x] 2.1 Run focused Supervisor transaction Jest (10 passed) and Playwright (1 passed), web typecheck, web lint (0 errors; one pre-existing warning in untouched `supervisor-flagged-activity.tsx`), OpenSpec validation (57 passed), Prettier, and `git diff --check`.
