## 1. Worker Shutdown

- [x] 1.1 Make outbox worker shutdown stop the recovery timer before closing BullMQ and Prisma resources.
- [x] 1.2 Ensure repeated shutdown calls are idempotent and do not leave open handles behind.

## 2. Redis Test Harness

- [x] 2.1 Replace the brittle Redis lifecycle control with a test-owned process that exposes explicit start, stop, and restart operations.
- [x] 2.2 Bound Redis readiness and shutdown waits so test teardown cannot hang indefinitely.

## 3. Recovery Test Cleanup

- [x] 3.1 Update the worker recovery regression to use the new Redis lifecycle control for outage and restart simulation.
- [x] 3.2 Remove any force-exit or cleanup-race workarounds from the targeted recovery test.

## 4. Verification

- [x] 4.1 Run the targeted worker recovery integration spec and confirm it exits cleanly without background retry noise.
- [x] 4.2 Re-run the related worker regression suite to verify shutdown cleanup does not change recovery behavior.
