-- CreateIndex
CREATE INDEX "DailyView_userId_idx" ON "DailyView"("userId");

-- CreateIndex
CREATE INDEX "DailyView_date_idx" ON "DailyView"("date");

-- CreateIndex
CREATE INDEX "Rating_userId_idx" ON "Rating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_userId_quoteId_key" ON "Rating"("userId", "quoteId");
