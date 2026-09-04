-- Preserve the short lifetime across smoke-session refresh rotation.
ALTER TABLE "Session"
  ADD COLUMN "smokeMaxLifetimeMs" INTEGER;
