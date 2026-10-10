import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const BATCH_SIZE = 500;

/// Simultaneous writes in flight, matched to the Postgres pool's `max`.
/// Higher just queues on connection acquisition; lower wastes round trips.
const WRITE_CONCURRENCY = 10;

/**
 * The committed IndoPak snapshot. Provenance, licensing position and the
 * refresh command are in `docs/quran_script_provenance.md`.
 *
 * Read from disk rather than fetched, unlike the Uthmani seed above. Scripture
 * shipped in a paid app should be byte-reproducible: a seed that fetches at
 * run time writes whatever the upstream served that morning, and nobody can
 * later tell what was written or audit it without a network. The snapshot is
 * the audit artifact, and `src/faiths/islam/quran/indopak-script.spec.ts`
 * gates *this file* offline, which it could not do for a live fetch.
 */
const INDOPAK_SNAPSHOT = join(__dirname, 'data', 'quran-indopak.json');

/**
 * U+0671 ARABIC LETTER ALEF WASLA. Uthmani writes it; IndoPak never does —
 * it writes a plain alef (U+0627) and marks the elision differently. It
 * occurs 0 times in the snapshot and 1000s of times in the Uthmani text, so
 * its presence is a positive, cheap proof that Uthmani has been written into
 * the IndoPak column — the one failure mode that passes every structural
 * check. Guarded here before the write, not only in the spec, because the
 * spec cannot see a snapshot someone swapped out on a laptop.
 */
const ALEF_WASLA = '\u0671';

/** U+0615 ARABIC SMALL HIGH TAH — the IndoPak waqf mark. Uthmani uses U+06DA/U+06D9 instead. */
const INDOPAK_WAQF_TAH = '\u0615';

/** Every verse in the muṣḥaf. Not a target to approach — an exact count. */
const TOTAL_VERSES_IN_QURAN = 6236;

interface IndopakVerse {
  verse_key: string;
  text_indopak: string;
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.json();
}

async function buildVerseMap(
  prisma: PrismaClient,
): Promise<Map<string, string>> {
  console.log('   Building verse lookup map...');
  const verses = await prisma.quranVerse.findMany({
    select: { id: true, surahId: true, verseNumber: true },
  });
  const map = new Map<string, string>();
  for (const v of verses) {
    map.set(`${v.surahId}:${v.verseNumber}`, v.id);
  }
  console.log(`   Loaded ${map.size} verses into lookup map.`);
  return map;
}

async function seedUthmaniScript(
  prisma: PrismaClient,
  verseMap: Map<string, string>,
): Promise<void> {
  console.log('📜 Seeding Uthmani script...');

  // Check if already seeded
  const sample = await prisma.quranVerse.findFirst({
    where: { textUthmani: { not: null } },
    select: { id: true },
  });
  if (sample) {
    console.log('   Uthmani script already seeded. Skipping.');
    return;
  }

  console.log('   Fetching quran-uthmani from Al Quran Cloud API...');
  const response = await fetchJson(
    'https://api.alquran.cloud/v1/quran/quran-uthmani',
  );
  const surahs = response?.data?.surahs;

  if (!surahs || !Array.isArray(surahs)) {
    console.warn('   Warning: Invalid response for quran-uthmani. Skipping.');
    return;
  }

  // Build update rows
  const rows: { id: string; textUthmani: string }[] = [];
  for (const surah of surahs) {
    for (const ayah of surah.ayahs) {
      const verseId = verseMap.get(`${surah.number}:${ayah.numberInSurah}`);
      if (verseId) {
        rows.push({ id: verseId, textUthmani: ayah.text });
      }
    }
  }

  console.log(`   Updating ${rows.length} verses with Uthmani text...`);

  // Batch update
  let updated = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((row) =>
        prisma.quranVerse.update({
          where: { id: row.id },
          data: { textUthmani: row.textUthmani },
        }),
      ),
    );
    updated += batch.length;
    if (updated % 2000 === 0 || updated === rows.length) {
      console.log(`   Updated ${updated}/${rows.length} verses.`);
    }
  }

  console.log(`   Uthmani script seeded (${updated} verses).`);
}

/**
 * IndoPak script — `text_indopak`.
 *
 * ## Why this column exists at all
 *
 * IndoPak is an **encoding, not a typeface**. The mobile app's Arabic-script
 * preference defaults to "Indo-Pak" and used to swap *fonts* over one and the
 * same Uthmani Unicode string, which cannot work: the two scripts differ in
 * their actual codepoints. 2:142 in Uthmani opens
 * `۞سَيَقُولُ ٱلسُّفَهَآءُ` (U+0671 alef-wasla) and in IndoPak
 * `سَيَقُوۡلُ السُّفَهَآءُ` (plain U+0627 alef, explicit sukun-like
 * U+06E1 over the long vowel). No font bridges that. India is this app's
 * primary market, so the default setting named the script people actually
 * read and then showed them a different one.
 *
 * ## Batching
 *
 * One `$transaction` per 500 verses — 13 round trips for the whole muṣḥaf,
 * and **no `await` inside a per-verse loop**. The chunk size is bounded
 * deliberately: `PrismaService`'s pool is `max: 10`, and this codebase has a
 * documented history of per-item awaits and of unbounded `Promise.all` fans
 * over a small pool (see `e9f3aea perf(activity): bound rollup write
 * concurrency to the pg pool`). A `$transaction` over an array issues the
 * batch on **one** connection, so the fan-out is 1 regardless of chunk size.
 */
async function seedIndopakScript(
  prisma: PrismaClient,
  verseMap: Map<string, string>,
): Promise<void> {
  console.log('📜 Seeding IndoPak script...');

  // Already-seeded skip check. Deliberately a *count* against the full
  // muṣḥaf rather than the Uthmani seeder's `findFirst`, because `findFirst`
  // has an unrecoverable failure mode here: the writes below are committed
  // per 500-verse chunk, so a run that dies at chunk 7 leaves ~3,000 verses
  // written and the rest null — and a `findFirst` check would then see one
  // non-null row on the next run, print "already seeded", and exit 0 forever
  // with a third of the Qur'an missing. The updates are keyed by row id and
  // idempotent, so re-running a partial seed is free and self-healing.
  const alreadySeeded = await prisma.quranVerse.count({
    where: { textIndopak: { not: null } },
  });
  if (alreadySeeded === TOTAL_VERSES_IN_QURAN) {
    console.log('   IndoPak script already seeded. Skipping.');
    return;
  }
  if (alreadySeeded > 0) {
    console.log(
      `   Partial IndoPak seed found (${alreadySeeded}/${TOTAL_VERSES_IN_QURAN}). Re-running to completion.`,
    );
  }

  console.log(`   Reading committed snapshot ${INDOPAK_SNAPSHOT} ...`);
  const snapshot = JSON.parse(readFileSync(INDOPAK_SNAPSHOT, 'utf8'));
  const verses: IndopakVerse[] = snapshot?.verses;

  if (!Array.isArray(verses)) {
    throw new Error(
      'IndoPak snapshot is malformed: expected a top-level "verses" array.',
    );
  }

  if (verses.length !== TOTAL_VERSES_IN_QURAN) {
    throw new Error(
      `IndoPak snapshot holds ${verses.length} verses, expected ${TOTAL_VERSES_IN_QURAN}. Refusing to seed a partial muṣḥaf.`,
    );
  }

  // Resolve verse_key -> row id via the @@unique([surahId, verseNumber])
  // lookup built above. Unresolved keys are *reported by name*, never skipped
  // silently: a key that does not resolve means the base Qur'an seed and this
  // snapshot disagree about the muṣḥaf, which is not a thing to shrug at.
  const rows: { id: string; textIndopak: string }[] = [];
  const unresolved: string[] = [];
  const empty: string[] = [];
  let wasla = 0;

  for (const verse of verses) {
    const id = verseMap.get(verse.verse_key);
    if (!id) {
      unresolved.push(verse.verse_key);
      continue;
    }
    const text = verse.text_indopak;
    if (!text || !text.trim()) {
      empty.push(verse.verse_key);
      continue;
    }
    if (text.includes(ALEF_WASLA)) wasla++;
    rows.push({ id, textIndopak: text });
  }

  if (unresolved.length > 0) {
    throw new Error(
      `${unresolved.length} verse_key(s) in the IndoPak snapshot do not exist in quran_verses: ` +
        `${unresolved.slice(0, 20).join(', ')}${unresolved.length > 20 ? ' …' : ''}`,
    );
  }
  if (empty.length > 0) {
    throw new Error(
      `${empty.length} verse(s) in the IndoPak snapshot have empty text: ` +
        `${empty.slice(0, 20).join(', ')}${empty.length > 20 ? ' …' : ''}`,
    );
  }
  if (wasla > 0) {
    throw new Error(
      `${wasla} verse(s) in the IndoPak snapshot contain U+0671 alef-wasla, which IndoPak never writes. ` +
        'This is Uthmani text about to be written into the IndoPak column. Refusing to seed.',
    );
  }
  if (!rows.some((r) => r.textIndopak.includes(INDOPAK_WAQF_TAH))) {
    throw new Error(
      'No verse in the IndoPak snapshot contains U+0615 (ARABIC SMALL HIGH TAH), the IndoPak waqf mark. ' +
        'This does not look like IndoPak text. Refusing to seed.',
    );
  }

  console.log(`   Updating ${rows.length} verses with IndoPak text...`);

  let updated = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    // Deliberately NOT wrapped in a transaction.
    //
    // The first live run was `$transaction(batch.map(update))` and died at
    // 5097ms with P2028: 500 sequential UPDATEs over the wire to RDS exceed
    // Prisma's 5s interactive-transaction default, and the array form of
    // $transaction accepts only `isolationLevel` — `timeout` is available
    // solely on the callback form, which would mean an await-per-row inside
    // one long-held transaction.
    //
    // Atomicity buys nothing here: this fills a brand-new nullable column
    // that no reader depends on yet, every write is idempotent (same id,
    // same text), the already-seeded check counts non-null rows rather than
    // probing for one, and the post-write count below refuses to report
    // success on a partial result. A half-finished run is simply re-run.
    //
    // Concurrency is pinned to the connection pool rather than the batch
    // size. The Uthmani seeder above fans 500 ways into a `max: 10` pool and
    // leaves 490 promises queueing on connection acquisition.
    for (let j = 0; j < batch.length; j += WRITE_CONCURRENCY) {
      await Promise.all(
        batch.slice(j, j + WRITE_CONCURRENCY).map((row) =>
          prisma.quranVerse.update({
            where: { id: row.id },
            data: { textIndopak: row.textIndopak },
          }),
        ),
      );
    }
    updated += batch.length;
    if (updated % 2000 === 0 || updated === rows.length) {
      console.log(`   Updated ${updated}/${rows.length} verses.`);
    }
  }

  // Post-write verification against the database itself, not against the
  // array we just built from.
  const written = await prisma.quranVerse.count({
    where: { textIndopak: { not: null } },
  });
  if (written !== TOTAL_VERSES_IN_QURAN) {
    throw new Error(
      `After seeding, ${written} rows have text_indopak; expected ${TOTAL_VERSES_IN_QURAN}.`,
    );
  }

  console.log(`   IndoPak script seeded (${updated} verses, ${written} non-null rows).`);
}

export async function seedQuranScripts(
  prisma: PrismaClient,
): Promise<void> {
  console.log('\n📜 Starting Quran script data seed...');

  const verseMap = await buildVerseMap(prisma);

  if (verseMap.size === 0) {
    console.warn(
      '   No QuranVerse records found. Make sure the base Quran seed has run first. Skipping.',
    );
    return;
  }

  await seedUthmaniScript(prisma, verseMap);
  await seedIndopakScript(prisma, verseMap);

  console.log('📜 Quran script data seed completed!\n');
}

/**
 * Standalone runner — `npm run prisma:seed:quran-scripts`.
 *
 * `prisma/seed.ts` calls `seedQuranScripts` as part of the full seed, but the
 * full seed also touches roles, permissions and every other faith's content.
 * Back-filling one nullable column on an already-live database should not
 * require running all of that, so this file is runnable on its own. Both
 * seeders above are idempotent via their already-seeded skip checks.
 */
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv/config');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaPg } = require('@prisma/adapter-pg');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require('pg');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { prismaSchemaOptions } = require('../src/common/utils/db-schema');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl.replace('sslmode=require', ''),
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool, prismaSchemaOptions()),
  });

  seedQuranScripts(prisma)
    .catch((e) => {
      console.error('❌ Quran script seed failed:', e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
