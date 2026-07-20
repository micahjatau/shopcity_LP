ALTER TABLE "Customer" ADD COLUMN "registeredByTenantId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "email" TEXT;
ALTER TABLE "Card" ADD COLUMN "issuedByTenantId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "actorTenantId" TEXT;

UPDATE "Customer"
SET "registeredByTenantId" = "tenantId"
WHERE "registeredBy" IS NOT NULL;

UPDATE "Card"
SET "issuedByTenantId" = "tenantId"
WHERE "issuedBy" IS NOT NULL;

UPDATE "AuditLog"
SET "actorTenantId" = "tenantId"
WHERE "actorId" IS NOT NULL;

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_registeredBy_pair_check"
  CHECK (("registeredByTenantId" IS NULL) = ("registeredBy" IS NULL));

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_registeredBy_tenant_match_check"
  CHECK (
    "registeredByTenantId" IS NULL
    OR "registeredByTenantId" = "tenantId"
  );

ALTER TABLE "Card"
  ADD CONSTRAINT "Card_issuedBy_pair_check"
  CHECK (("issuedByTenantId" IS NULL) = ("issuedBy" IS NULL));

ALTER TABLE "Card"
  ADD CONSTRAINT "Card_issuedBy_tenant_match_check"
  CHECK (
    "issuedByTenantId" IS NULL
    OR "issuedByTenantId" = "tenantId"
  );

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actor_pair_check"
  CHECK (("actorTenantId" IS NULL) = ("actorId" IS NULL));

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actor_tenant_match_check"
  CHECK (
    "actorTenantId" IS NULL
    OR "actorTenantId" = "tenantId"
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Customer"
    WHERE ("registeredByTenantId" IS NULL) <> ("registeredBy" IS NULL)
      OR (
        "registeredByTenantId" IS NOT NULL
        AND "registeredBy" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "User"
          WHERE "User"."tenantId" = "Customer"."registeredByTenantId"
            AND "User"."id" = "Customer"."registeredBy"
        )
      )
  ) THEN
    RAISE EXCEPTION 'Customer registeredBy tenant references are invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Card"
    WHERE ("issuedByTenantId" IS NULL) <> ("issuedBy" IS NULL)
      OR (
        "issuedByTenantId" IS NOT NULL
        AND "issuedBy" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "User"
          WHERE "User"."tenantId" = "Card"."issuedByTenantId"
            AND "User"."id" = "Card"."issuedBy"
        )
      )
  ) THEN
    RAISE EXCEPTION 'Card issuedBy tenant references are invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "AuditLog"
    WHERE ("actorTenantId" IS NULL) <> ("actorId" IS NULL)
      OR (
        "actorTenantId" IS NOT NULL
        AND "actorId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "User"
          WHERE "User"."tenantId" = "AuditLog"."actorTenantId"
            AND "User"."id" = "AuditLog"."actorId"
        )
      )
  ) THEN
    RAISE EXCEPTION 'Audit actor tenant references are invalid';
  END IF;
END $$;

ALTER TABLE "Customer"
  DROP CONSTRAINT IF EXISTS "Customer_registeredBy_fkey";

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_registeredBy_fkey"
  FOREIGN KEY ("registeredByTenantId", "registeredBy")
  REFERENCES "User"("tenantId", "id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "Card"
  DROP CONSTRAINT IF EXISTS "Card_issuedBy_fkey";

ALTER TABLE "Card"
  ADD CONSTRAINT "Card_issuedBy_fkey"
  FOREIGN KEY ("issuedByTenantId", "issuedBy")
  REFERENCES "User"("tenantId", "id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "Card"
  DROP CONSTRAINT IF EXISTS "Card_replacedByCardId_fkey";

ALTER TABLE "Card"
  ADD CONSTRAINT "Card_replacedByCardId_fkey"
  FOREIGN KEY ("tenantId", "replacedByCardId")
  REFERENCES "Card"("tenantId", "id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  DROP CONSTRAINT IF EXISTS "AuditLog_actor_fkey";

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actor_fkey"
  FOREIGN KEY ("actorTenantId", "actorId")
  REFERENCES "User"("tenantId", "id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "Customer_registeredByTenantId_registeredBy_idx"
  ON "Customer"("registeredByTenantId", "registeredBy");

CREATE UNIQUE INDEX "Customer_tenantId_email_key"
  ON "Customer"("tenantId", "email");

CREATE INDEX "Card_issuedByTenantId_issuedBy_idx"
  ON "Card"("issuedByTenantId", "issuedBy");

CREATE INDEX "AuditLog_actorTenantId_actorId_idx"
  ON "AuditLog"("actorTenantId", "actorId");
