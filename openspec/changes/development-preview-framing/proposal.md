# Development-only preview framing

## Why

OpenDesign's web Browser panel embeds the real Next application in an iframe. Development origins may vary; production must remain protected against framing.

## What Changes

- Omit `frame-ancestors` outside production.
- Emit `frame-ancestors 'none'` in production.
- Preserve `frame-src 'none'` and all other CSP directives.
- Keep the local preview loopback-bound; do not bypass authentication or change standalone TSX File Preview.

## Impact

All Next response headers from `apps/web/next.config.mjs`. GitNexus upstream impact for `contentSecurityPolicy`: LOW, zero indexed callers/processes. Verify development and production configuration separately and inspect live development response headers after restarting Next.
