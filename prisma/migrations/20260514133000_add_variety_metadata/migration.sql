-- Add metadata needed to measure and enforce daily inspiration variety.
ALTER TABLE "Quote" ADD COLUMN "mode" TEXT;
ALTER TABLE "Quote" ADD COLUMN "format" TEXT;
ALTER TABLE "Quote" ADD COLUMN "perspective" TEXT;
ALTER TABLE "Quote" ADD COLUMN "tone" TEXT;
ALTER TABLE "Quote" ADD COLUMN "imageryWorld" TEXT;
ALTER TABLE "Quote" ADD COLUMN "rhetoricalDevice" TEXT;
ALTER TABLE "Quote" ADD COLUMN "timeHorizon" TEXT;
ALTER TABLE "Quote" ADD COLUMN "actionType" TEXT;
ALTER TABLE "Quote" ADD COLUMN "difficulty" TEXT;
ALTER TABLE "Quote" ADD COLUMN "promptVersion" TEXT;
ALTER TABLE "Quote" ADD COLUMN "provider" TEXT;
ALTER TABLE "Quote" ADD COLUMN "noveltyScore" REAL;
ALTER TABLE "Quote" ADD COLUMN "generationTrace" TEXT;

CREATE INDEX "Quote_mode_idx" ON "Quote"("mode");
CREATE INDEX "Quote_format_idx" ON "Quote"("format");
CREATE INDEX "Quote_tone_idx" ON "Quote"("tone");
