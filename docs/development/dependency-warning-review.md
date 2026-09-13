# Dependency and tooling warning review

## Current policy

Deprecated package, Prisma, npm, and allow-scripts warnings are release-hygiene
signals. They should not block emergency correctness fixes unless they affect the
runtime path being certified, but they must be tracked before production signoff.

## Review steps

1. Run install/build/test commands in the release environment and capture warning
   categories without secret-bearing logs.
2. Classify each warning as runtime-critical, build-only, development-only, or
   false-positive/noisy.
3. Upgrade runtime-critical dependencies only when the affected test suite can be
   rerun in the same session.
4. For Prisma warnings, confirm generated client compatibility and migration
   status before changing versions.
5. For allow-scripts warnings, verify scripts are intentionally blocked or
   explicitly approved by the owner.
6. Record accepted residual risk with package name, category, owner, and next
   review date.

## Accepted local warning

The repeated npm `globalignorefile` warning is a local npm configuration warning
observed during repository commands. It is not evidence of an application runtime
failure, but should be cleaned up in the developer environment or CI image to
reduce log noise.
