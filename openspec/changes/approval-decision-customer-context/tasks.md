## 1. Supervisor decision evidence

- [x] 1.1 Remove the approval UUID evidence row and UUID from user-facing decision confirmation; focused approvals-panel tests verify the UUID is absent while the decision endpoint still receives the internal ID.
- [x] 1.2 Fetch authoritative wallet balance and lifetime earned for the selected real customer; the focused 15-test approvals-panel suite verifies NGN/zero formatting, independent loading/errors, no-ID behavior, and stale-response protection.

## 2. Verification

- [x] 2.1 Run the focused approvals-panel Jest suite (15 tests), web typecheck, web lint (0 errors; one existing warning in untouched `supervisor-flagged-activity.tsx`), OpenSpec validation (56 items), Prettier, and `git diff --check`; the Admin default-variant test passes and no API changes were made.
