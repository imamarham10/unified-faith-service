/**
 * check-hindu-verse-duplicates.ts
 * ---------------------------------------------------------------------------
 * Pre-flight for migration `20261011121000_add_hindu_text_verse_unique`
 * (team/curated-collections-spec.md §1.3).
 *
 * `hindu_text_verses` has only an `@@index([textId, chapterId, verseNumber])`.
 * Nothing has ever stopped a re-run of `seed-ramayana.ts` from inserting a
 * second copy of every one of the ~19,371 shlokas, and `CREATE UNIQUE INDEX`
 * over dirty data aborts — leaving `prisma migrate deploy` blocked on a failed
 * migration until a human resolves it. So: look before you migrate.
 *
 * STRICTLY READ-ONLY. It issues SELECTs only. It never deletes, never writes,
 * never migrates. Where it finds duplicates it prints the row ids and a
 * *candidate* DELETE for a human to review — the spec is explicit that
 * duplicates are reported, never silently removed.
 *
 * It also counts `chapter_id IS NULL` rows, because the unique index does NOT
 * bind them: Postgres treats NULLs as distinct inside a unique index, so a
 * null-chapter verse can still duplicate freely after the migration. That is a
 * real hole in §1.3's proposed fix and this script is where you find out how
 * big it is. See the schema comment on `HinduTextVerse`.
 *
 * Usage:
 *   npm run prisma:check:hindu-verse-dupes
 *   npm run prisma:check:hindu-verse-dupes -- --self-test   # offline logic proof
 *
 * Exit codes — chosen to match prisma/verify-feelings-citations.ts:
 *   0 = clean; the unique index will create successfully
 *   1 = duplicates found (or a failing self-test); the migration WILL fail
 *   2 = could not reach / read the database; nothing was verified
 *
 * DATABASE_URL is never printed, including in error paths.
 */

import 'dotenv/config';

const ARGV = process.argv.slice(2);
const SELF_TEST = ARGV.includes('--self-test');

const EXIT_OK = 0;
const EXIT_DIRTY = 1;
const EXIT_INFRA = 2;

const BAR = '='.repeat(78);

// ---------------------------------------------------------------------------
// 1. Shapes
// ---------------------------------------------------------------------------

interface DuplicateGroup {
  textSlug: string;
  chapterNumber: number | null;
  verseNumber: number;
  rowIds: string[];
}

interface Survey {
  totalVerses: number;
  nullChapterRows: number;
  duplicateGroups: DuplicateGroup[];
  /** Total rows sitting inside duplicate groups (including the keepers). */
  rowsInDuplicateGroups: number;
  perText: Array<{ slug: string; verses: number }>;
}

/**
 * The single judgement this script makes, extracted so the self-test can
 * exercise it without a database.
 *
 * `CREATE UNIQUE INDEX (text_id, chapter_id, verse_number)` fails if and only
 * if two rows share all three values — and NULL never equals NULL in a unique
 * index, so groups whose chapterNumber is null are *not* blocking. They are
 * still reported, loudly, because they are the hole the index leaves open.
 */
export function classify(groups: DuplicateGroup[]): {
  blocking: DuplicateGroup[];
  nonBlockingNullChapter: DuplicateGroup[];
} {
  const blocking: DuplicateGroup[] = [];
  const nonBlockingNullChapter: DuplicateGroup[] = [];
  for (const g of groups) {
    (g.chapterNumber === null ? nonBlockingNullChapter : blocking).push(g);
  }
  return { blocking, nonBlockingNullChapter };
}

// ---------------------------------------------------------------------------
// 2. Database survey
// ---------------------------------------------------------------------------

async function surveyDatabase(): Promise<Survey> {
  // Required lazily so `--self-test` runs with no client, no pool, no .env.
  /* eslint-disable @typescript-eslint/no-var-requires */
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');
  const { prismaSchemaOptions } = require('../src/common/utils/db-schema');
  /* eslint-enable @typescript-eslint/no-var-requires */

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({
    // `sslmode=require` is stripped, as every other standalone script here
    // does (see seed-quran-scripts.ts). RDS presents a self-signed chain;
    // leaving the mode in the URL makes pg enforce it strictly and the
    // adapter's `rejectUnauthorized: false` never gets a say — the failure
    // reads as "self-signed certificate in certificate chain" from Prisma's
    // engine rather than as a TLS-mode mismatch, which is why it looks like
    // a cert problem and is not one.
    connectionString: databaseUrl.replace('sslmode=require', ''),
    ssl: { rejectUnauthorized: false },
    // PrismaPg's `schema` option qualifies statements the *query engine*
    // builds, but this script asks raw SQL questions Prisma's model API
    // cannot express (grouping to find duplicates). Raw SQL is passed
    // through untouched, so it resolves against the connection's search_path
    // — which is `public` by default, where these tables do not live. Hence
    // setting it on the connection itself.
    options: (() => {
      const schema = prismaSchemaOptions(databaseUrl)?.schema;
      return schema ? `-c search_path=${schema},public` : undefined;
    })(),
    max: 2,
    connectionTimeoutMillis: 10000,
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool, prismaSchemaOptions(databaseUrl)),
  });

  try {
    // `prisma` here is `any` (lazily `require`d), so the row types are applied
    // by assertion rather than as type arguments.
    const [totals] = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE chapter_id IS NULL)::int AS null_chapters
         FROM hindu_text_verses`,
    )) as Array<{ total: number; null_chapters: number }>;

    const perText = (await prisma.$queryRawUnsafe(
      `SELECT t.slug, COUNT(v.id)::int AS verses
         FROM hindu_texts t
         LEFT JOIN hindu_text_verses v ON v.text_id = t.id
        GROUP BY t.slug
        ORDER BY verses DESC`,
    )) as Array<{ slug: string; verses: number }>;

    // One statement. The aggregation happens in Postgres; nothing is paged
    // into Node row by row, which matters at ~19k Ramayana rows.
    const rawGroups = (await prisma.$queryRawUnsafe(
      `SELECT t.slug,
              c.chapter_number,
              v.verse_number,
              ARRAY_AGG(v.id::text ORDER BY v.created_at, v.id) AS row_ids
         FROM hindu_text_verses v
         JOIN hindu_texts t ON t.id = v.text_id
         LEFT JOIN hindu_text_chapters c ON c.id = v.chapter_id
        GROUP BY t.slug, v.text_id, v.chapter_id, c.chapter_number, v.verse_number
       HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC, t.slug, c.chapter_number, v.verse_number`,
    )) as Array<{
      slug: string;
      chapter_number: number | null;
      verse_number: number;
      row_ids: string[];
    }>;

    const duplicateGroups: DuplicateGroup[] = rawGroups.map((r) => ({
      textSlug: r.slug,
      chapterNumber: r.chapter_number,
      verseNumber: r.verse_number,
      rowIds: r.row_ids,
    }));

    return {
      totalVerses: totals?.total ?? 0,
      nullChapterRows: totals?.null_chapters ?? 0,
      duplicateGroups,
      rowsInDuplicateGroups: duplicateGroups.reduce(
        (n, g) => n + g.rowIds.length,
        0,
      ),
      perText,
    };
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// 3. Reporting
// ---------------------------------------------------------------------------

function report(survey: Survey): number {
  const { blocking, nonBlockingNullChapter } = classify(survey.duplicateGroups);

  console.log('');
  console.log(BAR);
  console.log('  hindu_text_verses — duplicate survey');
  console.log('  pre-flight for 20261011121000_add_hindu_text_verse_unique');
  console.log(BAR);

  console.log(`\n  rows total ............... ${survey.totalVerses}`);
  console.log(`  rows with chapter_id NULL  ${survey.nullChapterRows}`);
  console.log(`  duplicate groups ......... ${survey.duplicateGroups.length}`);
  console.log(`    of which blocking ...... ${blocking.length}`);
  console.log(`    of which NULL-chapter .. ${nonBlockingNullChapter.length}`);
  console.log(`  rows inside those groups . ${survey.rowsInDuplicateGroups}`);

  if (survey.perText.length) {
    console.log('\n  VERSES PER TEXT');
    for (const row of survey.perText) {
      console.log(`    ${String(row.verses).padStart(7)}  ${row.slug}`);
    }
  }

  if (blocking.length) {
    console.log(
      `\nBLOCKING (${blocking.length}) — CREATE UNIQUE INDEX will abort on these`,
    );
    for (const g of blocking.slice(0, 50)) {
      console.log(
        `  ${g.textSlug} ch.${g.chapterNumber} v.${g.verseNumber} — ${g.rowIds.length} rows`,
      );
      console.log(`    keep  ${g.rowIds[0]}`);
      for (const id of g.rowIds.slice(1)) console.log(`    dupe  ${id}`);
    }
    if (blocking.length > 50) {
      console.log(`  … and ${blocking.length - 50} more groups not listed`);
    }
    console.log(
      '\n  CANDIDATE REMEDY — review every id above before running anything.',
    );
    console.log(
      '  This script will not delete for you. Translations, bookmarks and',
    );
    console.log(
      '  emotion remedies hang off these rows; deleting the wrong copy',
    );
    console.log('  cascades. The oldest row in each group is listed as "keep":');
    console.log('');
    console.log('    -- inspect first:');
    console.log(
      "    SELECT id, text_id, chapter_id, verse_number, created_at FROM hindu_text_verses WHERE id IN ('…');",
    );
    console.log('    -- then, per group, delete only the reviewed ids.');
  }

  if (nonBlockingNullChapter.length) {
    console.log(
      `\nNOT BLOCKING, STILL WRONG (${nonBlockingNullChapter.length}) — chapter_id IS NULL`,
    );
    console.log(
      '  Postgres treats NULLs as distinct inside a unique index, so these',
    );
    console.log(
      '  duplicate rows survive the migration and can duplicate again on the',
    );
    console.log(
      '  next re-seed. §1.3 of the spec does not account for this. Options are',
    );
    console.log(
      '  in the migration file header (NULLS NOT DISTINCT, or a partial index).',
    );
    for (const g of nonBlockingNullChapter.slice(0, 20)) {
      console.log(
        `  ${g.textSlug} ch.NULL v.${g.verseNumber} — ${g.rowIds.length} rows`,
      );
    }
    if (nonBlockingNullChapter.length > 20) {
      console.log(
        `  … and ${nonBlockingNullChapter.length - 20} more groups not listed`,
      );
    }
  }

  console.log('');
  console.log(BAR);
  if (blocking.length === 0) {
    console.log(
      '  CLEAN — the unique index will create. Safe to run migrate deploy.',
    );
    if (survey.nullChapterRows > 0) {
      console.log(
        `  (note: ${survey.nullChapterRows} rows have chapter_id NULL and are not`,
      );
      console.log('   covered by the index — see above.)');
    }
  } else {
    console.log(
      `  DIRTY — ${blocking.length} blocking group(s). DO NOT migrate yet.`,
    );
  }
  console.log(BAR);
  console.log('');

  return blocking.length === 0 ? EXIT_OK : EXIT_DIRTY;
}

// ---------------------------------------------------------------------------
// 4. Self-test — proves the classification offline, no database
// ---------------------------------------------------------------------------

function runSelfTest(): number {
  const cases: Array<{ what: string; ok: boolean }> = [];

  const groups: DuplicateGroup[] = [
    {
      textSlug: 'ramayana-bala-kanda',
      chapterNumber: 1,
      verseNumber: 1,
      rowIds: ['a', 'b'],
    },
    {
      textSlug: 'ramayana-bala-kanda',
      chapterNumber: null,
      verseNumber: 9,
      rowIds: ['c', 'd', 'e'],
    },
    {
      textSlug: 'bhagavad-gita',
      chapterNumber: 12,
      verseNumber: 3,
      rowIds: ['f', 'g'],
    },
  ];

  const { blocking, nonBlockingNullChapter } = classify(groups);

  cases.push({
    what: 'two non-null-chapter groups are blocking',
    ok: blocking.length === 2,
  });
  cases.push({
    what: 'the null-chapter group is NOT blocking (NULLs are distinct in PG)',
    ok:
      nonBlockingNullChapter.length === 1 &&
      nonBlockingNullChapter[0].verseNumber === 9,
  });
  cases.push({
    what: 'an empty survey classifies as clean',
    ok: classify([]).blocking.length === 0,
  });
  cases.push({
    what: 'every input group lands in exactly one bucket',
    ok: blocking.length + nonBlockingNullChapter.length === groups.length,
  });

  console.log('');
  console.log(BAR);
  console.log('  SELF-TEST — duplicate classification (no database)');
  console.log(BAR);
  let failed = 0;
  for (const c of cases) {
    if (c.ok) {
      console.log(`  ok    ${c.what}`);
    } else {
      failed += 1;
      console.log(`  FAIL  ${c.what}`);
    }
  }
  console.log(BAR);
  console.log(
    `  ${cases.length - failed}/${cases.length} self-test cases passed`,
  );
  console.log(BAR);
  console.log('');
  return failed === 0 ? EXIT_OK : EXIT_DIRTY;
}

// ---------------------------------------------------------------------------
// 5. Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  if (SELF_TEST) return runSelfTest();

  let survey: Survey;
  try {
    survey = await surveyDatabase();
  } catch (error) {
    // Never print the error object wholesale — pg errors can carry the
    // connection string.
    const message = error instanceof Error ? error.message : String(error);
    console.error('');
    console.error(BAR);
    console.error('  COULD NOT SURVEY THE DATABASE — nothing was verified.');
    console.error(`  ${message}`);
    console.error('');
    console.error(
      '  Run with --self-test to exercise the classification logic offline.',
    );
    console.error(BAR);
    console.error('');
    return EXIT_INFRA;
  }

  return report(survey);
}

if (require.main === module) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch(() => {
      process.exitCode = EXIT_INFRA;
    });
}
