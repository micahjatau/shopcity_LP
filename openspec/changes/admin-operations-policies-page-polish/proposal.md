## Why

The Admin Operations and Policies pages use wider, less consistent page frames and typography than other Admin workspaces. Their copy is also more technical than necessary, and the Operations tab strip exposes a horizontal scrollbar; aligning these surfaces will make routine administration easier to scan without changing how either page works.

## What Changes

- Give Operations and Policies the same centered content width, page heading, supporting-text, and form typography as the established Admin workspace style.
- Hide the visible horizontal scrollbar on the Operations tab strip while keeping every tab reachable on narrow screens.
- Simplify Operations and Policies headings, descriptions, field labels, status messages, and controls copy.
- Preserve Operations tab behavior and destinations, Policies branch scoping and validation, the existing APIs, authorization, version checks, and audit behavior.

## Capabilities

### New Capabilities

- `admin-operations-policies-page-polish`: Consistent page framing, typography, accessible tab overflow, and plain-language copy for the Admin Operations and Policies pages.

### Modified Capabilities

None.

## Impact

- Frontend: Admin Operations tab workspace styles and copy; Admin Policies page presentation and copy; focused component/browser tests.
- OpenSpec: a new presentation capability for these two Admin pages.
- No API, database, authorization, policy-value, or financial behavior changes.
