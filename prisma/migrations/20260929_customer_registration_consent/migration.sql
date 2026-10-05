CREATE TABLE "CustomerConsent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "capturedBy" TEXT NOT NULL,
    "loyaltyConsent" BOOLEAN NOT NULL,
    "marketingOptIn" BOOLEAN NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "privacyNoticeVersion" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerConsent_tenantId_customerId_key"
    ON "CustomerConsent"("tenantId", "customerId");
CREATE INDEX "CustomerConsent_tenantId_capturedAt_idx"
    ON "CustomerConsent"("tenantId", "capturedAt");
CREATE INDEX "CustomerConsent_tenantId_capturedBy_idx"
    ON "CustomerConsent"("tenantId", "capturedBy");

ALTER TABLE "CustomerConsent"
    ADD CONSTRAINT "CustomerConsent_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerConsent"
    ADD CONSTRAINT "CustomerConsent_tenantId_customerId_fkey"
    FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerConsent"
    ADD CONSTRAINT "CustomerConsent_tenantId_capturedBy_fkey"
    FOREIGN KEY ("tenantId", "capturedBy") REFERENCES "User"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_customer_consent_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'CustomerConsent records are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CustomerConsent_append_only"
    BEFORE UPDATE OR DELETE ON "CustomerConsent"
    FOR EACH ROW EXECUTE FUNCTION prevent_customer_consent_mutation();
