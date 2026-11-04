## 1. Audit and design contract

- [x] 1.1 Inspect Figma frame and capture visual/content structure.
- [x] 1.2 Audit current Admin Overview and existing data endpoints; document mismatches and gaps.
- [x] 1.3 Confirm spec scope excludes shell, routing, API contract, and calculation changes.

## 2. Implementation

- [x] 2.1 Replace route-directory body with responsive Overview content and page-local styles.
- [x] 2.2 Connect existing report and pending-approval sources; handle unsupported metrics honestly.
- [x] 2.3 Implement accessible charts, Recent activity label dictionary, and resilient request states.
- [x] 2.4 Add focused tests for data mapping, labels, states, and responsive semantic structure.
- [x] 2.5 Write implementation changelog, live-vs-Figma differences, and API gaps/questions.
- [x] 2.6 Add typed runtime-validated adapters and resilient per-endpoint request states.
- [x] 2.7 Add report materialization freshness context and accurate seven-day chart gaps/tooltips.
- [x] 2.8 Fix transparent role-sidebar corner fill in CSS only; preserve all shell behavior.
- [x] 2.9 Update tests and implementation/API gap documentation for expanded data flow.

## 3. Verification

- [ ] 3.1 Run focused tests and the web typecheck; focused tests/typecheck pass, but the full web Jest suite has one unrelated pre-existing Supervisor accessibility assertion failure. Configured ESLint is blocked by the existing ESLint/Next config incompatibility; isolated TypeScript/JSX-a11y/React-Hooks lint passes.
- [x] 3.2 Verify desktop/mobile presentation in a browser using mocked APIs; 1440px and 320px checks/screenshots pass with no horizontal overflow.
- [x] 3.3 Run GitNexus detect_changes; broad HIGH result includes pre-existing dirty changes, while the only edited application route is AdminPage.
