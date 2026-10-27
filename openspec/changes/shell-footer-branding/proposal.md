# Replace shared-shell footer metadata with brand attribution

## Why

The shared application shell currently repeats the active branch and timezone in its navigation footer. The footer should instead display the requested Radar Solutions attribution consistently across desktop and mobile shell navigation.

## What Changes

- Replace the desktop sidebar footer's branch/timezone line with `Powered by Radar Solutions`.
- Replace the mobile navigation drawer's separate branch and timezone lines with the same attribution.
- Keep branch and timezone data available to API/business logic; this is a presentation-only change.

## Non-goals

- Do not change navigation, authorization, route selection, branch scope, timezone configuration, or any transaction/report behavior.

## Impact

- `AppSidebar` and the shared shell's mobile navigation drawer.
- App-shell tests and focused shell/browser verification.
