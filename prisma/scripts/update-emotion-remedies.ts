/**
 * update-emotion-remedies.ts  —  the keyed update path for Islam feelings
 * ---------------------------------------------------------------------------
 *     npm run prisma:update:emotion-remedies              # dry run (default)
 *     npm run prisma:update:emotion-remedies -- --apply   # writes
 *
 * ## Why this file exists
 *
 * `prisma/seed-feelings.ts` can ADD but cannot EDIT (architecture audit §A).
 * Remedies are guarded by `findFirst({ emotionId, source, arabicText })` and
 * then `create`d, so:
 *
 *   - changing a remedy's text in the seed creates a SECOND row — the user
 *     sees the same du'a twice;
 *   - deleting a remedy from the seed deletes NOTHING — the live row stays
 *     and keeps being served.
 *
 * Every correction to content that is already live therefore runs through
 * here, matched on the same natural key the seed dedupes on:
 * `(emotion.slug, source, arabicText)`.
 *
 * ## Safety properties
 *
 *   - **Dry run by default.** Nothing is written without `--apply`.
 *   - **Exact-match or refuse.** An operation that matches zero rows, or more
 *     than one, aborts the whole run. It never guesses.
 *   - **Prints the full row before deleting it**, so the operation is
 *     reversible by hand from this terminal output alone.
 *   - **One transaction.** Either every operation applies or none does.
 *   - Never prints DATABASE_URL.
 *
 * ## Not yet implemented, and deliberately so
 *
 * Spec §3.2 also wants this script to backfill `note`, populate `sequence`,
 * normalise the two transliteration schemes in `angry`, normalise the three
 * spellings of Abu Dawud, and set `reviewStatus: retired` instead of
 * deleting. `note`, `sequence` and `reviewStatus` are **columns that do not
 * exist yet** (spec track (a) item 3). Until they land, "retire" can only
 * mean DELETE — which is why the deleted row is echoed in full below.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { prismaSchemaOptions } from '../../src/common/utils/db-schema';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  // See seed-collections.ts: RDS presents a self-signed chain and leaving
  // sslmode=require in the URL makes pg enforce it strictly, surfacing as
  // P1011 "self-signed certificate in certificate chain".
  connectionString: databaseUrl.replace('sslmode=require', ''),
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool, prismaSchemaOptions(databaseUrl));
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.slice(2).includes('--apply');

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

interface RetireOp {
  op: 'retire';
  /** Natural key — the same triple seed-feelings.ts dedupes on. */
  emotionSlug: string;
  source: string;
  arabicText: string;
  reason: string;
}

const OPERATIONS: RetireOp[] = [
  {
    op: 'retire',
    emotionSlug: 'hurt',
    source: 'Quran 3:139',
    arabicText:
      'وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنْتُمُ الْأَعْلَوْنَ إِنْ كُنْتُمْ مُؤْمِنِينَ',
    reason:
      "Retires the only remedy `hurt` has ever served. 'So do not weaken and " +
      'do not grieve, and you will be superior if you are [true] believers.' +
      "' — a battlefield morale verse addressed to a defeated army after Uhud. " +
      'Fails research §3.2 criterion 3 (it instructs the reader not to feel ' +
      'what they just selected), criterion 4 (the comfort survives only by ' +
      'amputating the setting), and criterion 2 (the conditional tail reads ' +
      'as "my pain means my faith is deficient" — the punitive reappraisal ' +
      "Pargament's RCOPE ties to worse depression outcomes). Keeping it late " +
      'in a rotation is not implementable: getEmotionBySlug applies no ' +
      'orderBy and emotion_remedies has no sequence column, so it would be ' +
      'free to lead. Replaced by 4 new remedies in seed-feelings.ts.',
  },
];

// ---------------------------------------------------------------------------

async function main() {
  console.log(
    `🔧 Keyed emotion-remedy update — ${APPLY ? 'APPLY (writes)' : 'DRY RUN (no writes)'}`,
  );
  console.log('');

  const planned: { op: RetireOp; id: string }[] = [];

  for (const op of OPERATIONS) {
    const emotion = await prisma.emotion.findUnique({
      where: { slug: op.emotionSlug },
      select: { id: true, name: true },
    });
    if (!emotion) {
      throw new Error(
        `emotion "${op.emotionSlug}" does not exist — refusing to continue`,
      );
    }

    const matches = await prisma.emotionRemedy.findMany({
      where: {
        emotionId: emotion.id,
        source: op.source,
        arabicText: op.arabicText,
      },
    });

    if (matches.length !== 1) {
      throw new Error(
        `retire ${op.emotionSlug} <- "${op.source}" matched ${matches.length} row(s), expected exactly 1. ` +
          'Refusing to continue — no operation in this run has been applied. ' +
          (matches.length === 0
            ? 'Either it was already retired, or the stored Arabic differs from the key in this file.'
            : 'Duplicate rows exist; resolve them by hand first.'),
      );
    }

    const row = matches[0];
    const remaining = await prisma.emotionRemedy.count({
      where: { emotionId: emotion.id },
    });

    console.log(`  RETIRE  ${op.emotionSlug} (${emotion.name}) <- ${op.source}`);
    console.log(`    id            : ${row.id}`);
    console.log(`    arabicText    : ${row.arabicText}`);
    console.log(`    transliteration: ${row.transliteration ?? '(null)'}`);
    console.log(`    translation   : ${row.translation}`);
    console.log(`    source        : ${row.source}`);
    console.log(`    reason        : ${op.reason}`);
    console.log(
      `    after this, "${op.emotionSlug}" will hold ${remaining - 1} remedy row(s).`,
    );
    if (remaining - 1 === 0) {
      console.log(
        '    ⚠️  That leaves the emotion EMPTY. The detail screen would render ' +
          'nothing to someone who just said they feel this way. Run ' +
          'prisma:seed:feelings first, or exclude the pill client-side ' +
          '(spec §2.1 carve-out).',
      );
    }
    console.log('');

    planned.push({ op, id: row.id });
  }

  if (!APPLY) {
    console.log(
      `Dry run complete — ${planned.length} operation(s) would be applied. Nothing was written.`,
    );
    console.log('Re-run with --apply to execute.');
    return;
  }

  await prisma.$transaction(
    planned.map(({ id }) => prisma.emotionRemedy.delete({ where: { id } })),
  );

  console.log(`✅ Applied ${planned.length} operation(s) in one transaction.`);
  console.log(
    '   The deleted row is printed in full above — that output is the only ' +
      'record of it. Keep this terminal log until the change is confirmed good.',
  );
}

main()
  .catch((e) => {
    console.error(`❌ ${e?.message ?? e}`);
    console.error('   Nothing was written.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end().catch(() => undefined);
  });
