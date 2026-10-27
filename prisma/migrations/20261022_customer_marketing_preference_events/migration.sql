CREATE TYPE "CustomerMarketingPreference" AS ENUM ('OPTED_IN', 'OPTED_OUT');
CREATE TYPE "CustomerMarketingPreferenceSource" AS ENUM ('IN_STORE');

CREATE TABLE "CustomerMarketingPreferenceEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "capturedBy" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "preference" "CustomerMarketingPreference" NOT NULL,
    "source" "CustomerMarketingPreferenceSource" NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerMarketingPreferenceEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerMarketingPreferenceEvent_tenantId_customerId_capturedAt_idx"
    ON "CustomerMarketingPreferenceEvent"("tenantId", "customerId", "capturedAt");
CREATE INDEX "CustomerMarketingPreferenceEvent_tenantId_branchId_capturedAt_idx"
    ON "CustomerMarketingPreferenceEvent"("tenantId", "branchId", "capturedAt");
CREATE INDEX "CustomerMarketingPreferenceEvent_tenantId_capturedBy_capturedAt_idx"
    ON "CustomerMarketingPreferenceEvent"("tenantId", "capturedBy", "capturedAt");

ALTER TABLE "CustomerMarketingPreferenceEvent"
    ADD CONSTRAINT "CustomerMarketingPreferenceEvent_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerMarketingPreferenceEvent"
    ADD CONSTRAINT "CustomerMarketingPreferenceEvent_tenantId_customerId_fkey"
    FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerMarketingPreferenceEvent"
    ADD CONSTRAINT "CustomerMarketingPreferenceEvent_tenantId_capturedBy_fkey"
    FOREIGN KEY ("tenantId", "capturedBy") REFERENCES "User"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerMarketingPreferenceEvent"
    ADD CONSTRAINT "CustomerMarketingPreferenceEvent_tenantId_branchId_fkey"
    FOREIGN KEY ("tenantId", "branchId") REFERENCES "Branch"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_customer_marketing_preference_event_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'CustomerMarketingPreferenceEvent records are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CustomerMarketingPreferenceEvent_append_only"
    BEFORE UPDATE OR DELETE ON "CustomerMarketingPreferenceEvent"
    FOR EACH ROW EXECUTE FUNCTION prevent_customer_marketing_preference_event_mutation();
