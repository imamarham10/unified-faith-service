/*
  Warnings:

  - A unique constraint covering the columns `[hijri_month,hijri_day,name]` on the table `islamic_events` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "islamic_events_hijri_month_hijri_day_name_key" ON "islamic_events"("hijri_month", "hijri_day", "name");
