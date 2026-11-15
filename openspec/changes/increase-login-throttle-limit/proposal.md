# Change: Increase public login throttle limit

## Why

The current five-attempt limit within 15 minutes is too restrictive for legitimate sign-ins. Increase the password-login request allowance while preserving the existing account/IP protections and rate-limit response.

## What Changes

- Raise `/api/v1/auth/login` from 5 to 10 requests per 15-minute window for each existing IP, normalized-account, and IP/account bucket.
- Keep the existing `429 RATE_LIMITED` behavior and Redis-backed fixed-window implementation.
- Leave cashier WebAuthn login completion and password-recovery limits unchanged.

## Non-goals

- Do not change login credential checks, lockout behavior, throttle keys/window, other routes, or Redis configuration.
- Do not reset or clear existing Production/Preview throttle counters.
- Do not deploy this change as part of implementation.
