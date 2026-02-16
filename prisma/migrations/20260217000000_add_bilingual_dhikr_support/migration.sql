-- AlterTable for DhikrCounter
ALTER TABLE "dhikr_counters" ADD COLUMN "phrase_arabic" TEXT NOT NULL DEFAULT '',
ADD COLUMN "phrase_transliteration" TEXT,
ADD COLUMN "phrase_english" TEXT NOT NULL DEFAULT '';

-- Backfill existing data (assume phrase column contains Arabic text)
UPDATE "dhikr_counters" SET "phrase_arabic" = "phrase", "phrase_english" = 'Unknown phrase' WHERE "phrase_arabic" = '';

-- Remove old phrase column
ALTER TABLE "dhikr_counters" DROP COLUMN "phrase";

-- Add index for efficient lookups
CREATE INDEX "dhikr_counters_phrase_arabic_idx" ON "dhikr_counters"("phrase_arabic");

-- AlterTable for DhikrGoal
ALTER TABLE "dhikr_goals" ADD COLUMN "phrase_arabic" TEXT NOT NULL DEFAULT '',
ADD COLUMN "phrase_transliteration" TEXT,
ADD COLUMN "phrase_english" TEXT NOT NULL DEFAULT '';

-- Backfill existing data
UPDATE "dhikr_goals" SET "phrase_arabic" = "phrase", "phrase_english" = 'Unknown phrase' WHERE "phrase_arabic" = '';

-- Remove old phrase column
ALTER TABLE "dhikr_goals" DROP COLUMN "phrase";

-- AlterTable for DhikrHistory
-- First, drop the old unique constraint
ALTER TABLE "dhikr_history" DROP CONSTRAINT "dhikr_history_user_id_phrase_date_key";

-- Add new columns
ALTER TABLE "dhikr_history" ADD COLUMN "phrase_arabic" TEXT NOT NULL DEFAULT '',
ADD COLUMN "phrase_transliteration" TEXT,
ADD COLUMN "phrase_english" TEXT NOT NULL DEFAULT '';

-- Backfill existing data
UPDATE "dhikr_history" SET "phrase_arabic" = "phrase", "phrase_english" = 'Unknown phrase' WHERE "phrase_arabic" = '';

-- Remove old phrase column
ALTER TABLE "dhikr_history" DROP COLUMN "phrase";

-- Add new unique constraint with updated column names
ALTER TABLE "dhikr_history" ADD CONSTRAINT "dhikr_history_user_id_phraseArabic_date_key" UNIQUE ("user_id", "phrase_arabic", "date");
