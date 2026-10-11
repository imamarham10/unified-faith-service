-- Canonical (citable) hadith numbering, alongside the sequential reading key.
--
-- WHY. `seed-hadiths.ts` stored the upstream edition's `hadithnumber` — a
-- sequential index over narrations — in `hadith_number` and used it as the
-- citation number. For nine of the ten seeded collections that is also the
-- canonical number. For Sahih Muslim it is not: the edition runs 1..7563
-- sequentially while the canonical Abd al-Baqi numbering runs 1..3033, so
-- every Sahih Muslim citation in the app resolved to the wrong hadith.
--
-- WHY A NEW COLUMN RATHER THAN RE-KEYING `hadith_number`. The canonical
-- number is many-to-one: it names a hadith, while a row is a narration of it.
-- Muslim 715 has 26 rows. Re-keying would therefore violate
-- `hadiths_book_id_hadith_number_key`, and would also destroy reading order —
-- `hadith_number` is what the service's `orderBy` and prev/next navigation
-- use, and canonical order is not monotonic in it (120 inversions in Muslim).
-- So the sequential number stays as the ordering key and the canonical number
-- is added as the citation key.
--
-- NULLABLE ON PURPOSE. 344 Muslim rows (the Muqaddima and a few stragglers)
-- carry no canonical number upstream. They stay NULL and are not citable,
-- because an invented citation is worse than an absent one.
--
-- Additive and non-rewriting: two nullable INTEGER columns and one index.
-- Existing rows are untouched; nothing reads the columns until the backfill
-- (prisma/scripts/backfill-hadith-canonical-numbers.ts --apply) populates
-- them, and the content gate (prisma/verify-hadith-content.ts) falls back to
-- `hadith_number` while they are empty.
--
-- DEPLOY ORDER: apply this migration, then run the backfill, then redeploy.
-- Prisma emits every scalar of a model in the SELECT list of an unselected
-- findMany, so code that knows about the columns 500s until they exist.

-- AlterTable
ALTER TABLE "hadiths" ADD COLUMN     "canonical_number" INTEGER,
ADD COLUMN     "canonical_suffix" INTEGER;

-- CreateIndex
CREATE INDEX "hadiths_book_id_canonical_number_canonical_suffix_idx" ON "hadiths"("book_id", "canonical_number", "canonical_suffix");
