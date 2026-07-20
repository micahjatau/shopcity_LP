-- Validate existing ownership relationships before tightening constraints.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Device" device
    JOIN "Branch" branch ON branch.id = device."branchId"
    WHERE device."tenantId" <> branch."tenantId"
  ) THEN
    RAISE EXCEPTION 'Device tenant ownership is inconsistent';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "User" user_account
    JOIN "Branch" branch ON branch.id = user_account."branchId"
    WHERE user_account."branchId" IS NOT NULL
      AND user_account."tenantId" <> branch."tenantId"
  ) THEN
    RAISE EXCEPTION 'User tenant ownership is inconsistent';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Customer" customer
    JOIN "Branch" branch ON branch.id = customer."branchId"
    WHERE customer."tenantId" <> branch."tenantId"
  ) THEN
    RAISE EXCEPTION 'Customer tenant ownership is inconsistent';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Card" card
    JOIN "Customer" customer ON customer.id = card."customerId"
    WHERE card."tenantId" <> customer."tenantId"
  ) THEN
    RAISE EXCEPTION 'Card tenant ownership is inconsistent';
  END IF;
END $$;

-- Add composite ownership keys required by the new relations.
ALTER TABLE "Branch"
  ADD CONSTRAINT "Branch_tenantId_id_key" UNIQUE ("tenantId", "id");

ALTER TABLE "User"
  ADD CONSTRAINT "User_tenantId_id_key" UNIQUE ("tenantId", "id");

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_tenantId_id_key" UNIQUE ("tenantId", "id");

ALTER TABLE "Card"
  ADD CONSTRAINT "Card_tenantId_id_key" UNIQUE ("tenantId", "id");

-- Replace single-column ownership constraints with composite ownership constraints.
ALTER TABLE "Device" DROP CONSTRAINT IF EXISTS "Device_branchId_fkey";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_branchId_fkey";
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_branchId_fkey";
ALTER TABLE "Card" DROP CONSTRAINT IF EXISTS "Card_customerId_fkey";

ALTER TABLE "Device"
  ADD CONSTRAINT "Device_tenantId_branchId_fkey"
  FOREIGN KEY ("tenantId", "branchId") REFERENCES "Branch"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_tenantId_branchId_fkey"
  FOREIGN KEY ("tenantId", "branchId") REFERENCES "Branch"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_tenantId_branchId_fkey"
  FOREIGN KEY ("tenantId", "branchId") REFERENCES "Branch"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Card"
  ADD CONSTRAINT "Card_tenantId_customerId_fkey"
  FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
