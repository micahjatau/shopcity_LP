## Context

See `proposal.md` for motivation and `specs/admin-operations-policies-page-polish/spec.md` for observable requirements. Operations already has a page-local tab component and CSS module; Policies currently keeps most layout styles in inline objects. The shared content-width token is 1120px, matching the common operational page frame. Admin Overview has a narrower dashboard-specific frame, so this work will use the shared 1120px token rather than copy that one-off width.

The Policies page has pre-existing uncommitted navigation cleanup removing its redundant Admin self-link. Preserve that work and all existing API, policy, and save behavior.

## Goals / Non-Goals

**Goals:**

- Give Operations and Policies the same centered page frame and type hierarchy.
- Keep Operations tab selection accessible while removing its visible horizontal scrollbar.
- Make page descriptions, control descriptions, field labels, and status feedback easier to understand.

**Non-Goals:**

- Change tab state, destinations, policy calculations, values, validation, branch scope, API calls, authorization, or save/version behavior.
- Change the shared Dialog, shared Tabs component, or other Admin/Supervisor pages.

## Decisions

1. **Use the shared 1120px content-width token.** Apply `width: min(100%, var(--sc-prototype-contentMaxWidth))` and centered margins to both page roots. This matches the established operational-page frame and adapts to narrow screens. Do not copy the Admin Overview's 1064px dashboard-only width.
2. **Share a small page-frame CSS module.** Create common page, header, title, and supporting-copy classes for both pages. Keep Operations tab/control styling page-local, and move Policies' inline layout styles into a Policies CSS module that uses the shared page-frame classes. This avoids global selectors and prevents drift between the two requested pages.
3. **Reuse design-system typography and surfaces.** Use the existing profile page title/body tokens, shared text colors, spacing, borders, and radii. Keep policy fields and statuses readable without adding a new visual system.
4. **Hide only the tab strip's scrollbar track.** Retain horizontal overflow at narrow widths, use the existing roving keyboard tabs, and allow touch scrolling. Apply both standard and WebKit scrollbar-hiding rules; do not intercept wheel or keyboard events.
5. **Simplify copy without changing meaning.** Use the specified page headings/descriptions and shorter user-facing control/status labels. Use the Operations-only health presentation variant for simple metric/attention terms, and use plain labels and status copy in the Admin-only trend chart; leave other health-panel callers' copy unchanged. Keep units on policy values and explain that changes are recorded and conflicting edits must be reloaded before saving.
6. **Test presentation without requiring authenticated production data.** Extend focused Operations component coverage for the copy and controls; test Policies text and labels through a focused component/browser harness; assert computed page width, typography, and scrollbar styles at wide and narrow widths. Mock the existing endpoints and preserve their current response shapes.

## Risks / Trade-offs

- [Hiding the scrollbar could obscure that tabs overflow] → Preserve touch scrolling, keyboard tab navigation, accessible names, and a visible selected-tab indicator; cover overflow in a narrow-viewport test.
- [Copy edits could imply changed policy behavior] → Keep value units, version-conflict guidance, and audit disclosure; verify existing API payload and policy tests remain unchanged.
- [The Policies route has existing unrelated dirty work] → Apply only targeted edits and inspect the final diff so the existing Admin self-link removal and other worktree changes remain intact.

## Migration Plan

No data or API migration is required. Roll back by reverting the shared page-frame classes and targeted Operations/Policies copy/style changes; existing route behavior and policy state remain independent of presentation.
