-- AlterEnum
ALTER TYPE "OutboxEventStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

-- AlterTable
ALTER TABLE "OutboxEvent"
ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);
