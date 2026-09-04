-- Learned taste profile per user (JSON) built from good/bad ratings.
ALTER TABLE "User" ADD COLUMN "tasteProfile" TEXT;
ALTER TABLE "User" ADD COLUMN "tasteProfileUpdatedAt" DATETIME;

-- Calendar leaf headline and concrete micro action for today.
ALTER TABLE "Quote" ADD COLUMN "headline" TEXT;
ALTER TABLE "Quote" ADD COLUMN "microAction" TEXT;

-- Track whether a calendar leaf was actually opened and torn off by the user.
ALTER TABLE "DailyView" ADD COLUMN "firstOpenedAt" DATETIME;
ALTER TABLE "DailyView" ADD COLUMN "revealedAt" DATETIME;
ALTER TABLE "DailyView" ADD COLUMN "openCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Rating_quoteId_idx" ON "Rating"("quoteId");
