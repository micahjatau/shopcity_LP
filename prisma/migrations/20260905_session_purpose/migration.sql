-- Add an explicit session purpose so smoke sessions cannot enter refresh rotation.
CREATE TYPE "SessionPurpose" AS ENUM ('USER', 'SMOKE');

ALTER TABLE "Session"
ADD COLUMN "purpose" "SessionPurpose" NOT NULL DEFAULT 'USER';

-- The earlier rolling-lifetime marker is superseded by the non-refreshable purpose.
ALTER TABLE "Session"
DROP COLUMN "smokeMaxLifetimeMs";
