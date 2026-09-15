ALTER TABLE "ReportCashierDailySummary"
  ADD COLUMN "redemptionCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "redemptionValueKobo" BIGINT NOT NULL DEFAULT 0;
