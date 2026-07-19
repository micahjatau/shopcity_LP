-- Drop unused session refresh-token contract
DROP INDEX IF EXISTS "Session_refreshTokenHash_key";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "refreshTokenHash";

-- Enforce one active card per customer at the database level
CREATE UNIQUE INDEX "Card_one_active_per_customer"
ON "Card"("tenantId", "customerId")
WHERE "status" = 'ACTIVE';
