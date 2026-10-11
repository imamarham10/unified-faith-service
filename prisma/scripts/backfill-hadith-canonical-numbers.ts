/**
 * backfill-hadith-canonical-numbers.ts
 * ---------------------------------------------------------------------------
 * Repairs two content-integrity defects in the seeded hadith corpus, in place.
 *
 *   1. CITATION NUMBERING (Sahih Muslim only).
 *      `seed-hadiths.ts` stored the upstream edition's `hadithnumber` — a
 *      sequential index over narrations — as if it were the citation number.
 *      For nine of the ten collections those coincide. For Sahih Muslim they
 *      do not: the edition runs 1..7563 sequentially while the canonical
 *      Abd al-Baqi numbering (carried in `arabicnumber`) runs 1..3033. Every
 *      Muslim citation in the app therefore resolved to the wrong hadith —
 *      silently, because the number existed.
 *
 *   2. CHAPTER TITLES (Muslim badly, Bukhari mildly, others at the margins).
 *      `buildSectionLookup` filled a Map from `section_details` ranges that
 *      overlap, so later sections overwrote earlier ones. 5,785 of Muslim's
 *      7,563 rows ended up labelled "The Book of Virtues" and 41 of its 57
 *      sections vanished. Chapter titles are now taken per row from
 *      `reference.book`, which indexes `metadata.sections` directly and
 *      resolves on 100% of rows in all ten editions.
 *
 * WHY BACKFILL RATHER THAN RE-SEED
 *
 * `seed-hadiths.ts` does `deleteMany` then `createMany`, so a re-seed rolls
 * every hadith UUID. `user_favorite_hadiths` stores those UUIDs with no
 * foreign key, so a re-seed silently orphans favourites. The stored *text* is
 * already correct — only derived metadata is wrong — so this script UPDATEs
 * in place, keyed on the stable `(book_id, hadith_number)` pair. No row is
 * created or destroyed, no UUID changes, and running it twice is a no-op.
 *
 * It is also reversible in the only sense that matters: it writes to
 * `canonical_number` / `canonical_suffix` (previously NULL) and rewrites
 * `chapter_title` / `chapter_title_arabic` / `reference`, all of which are
 * reproducible from the CDN at any time.
 *
 * READ-ONLY BY DEFAULT. It will not write unless given `--apply`.
 * DATABASE_URL is never printed.
 *
 * Usage:
 *   npx ts-node prisma/scripts/backfill-hadith-canonical-numbers.ts            # dry run, all books
 *   npx ts-node prisma/scripts/backfill-hadith-canonical-numbers.ts --book=muslim
 *   npx ts-node prisma/scripts/backfill-hadith-canonical-numbers.ts --apply    # write
 *
 * Exit codes: 0 = clean, 1 = inconsistency found, 2 = could not reach the DB.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { prismaSchemaOptions } from '../../src/common/utils/db-schema';

const ARGV = process.argv.slice(2);
const APPLY = ARGV.includes('--apply');
const VERBOSE = ARGV.includes('--verbose');
const BOOK_FILTER = (ARGV.find((a) => a.startsWith('--book=')) || '')
  .split('=')[1]
  ?.toLowerCase();

const EXIT_OK = 0;
const EXIT_PROBLEM = 1;
const EXIT_INFRA = 2;

const CDN_BASE =
  'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

/** apiKey -> HadithBook.name, mirroring seed-hadiths.ts BOOK_CONFIGS. */
const BOOKS: Array<{ apiKey: string; name: string }> = [
  { apiKey: 'bukhari', name: 'Sahih al-Bukhari' },
  { apiKey: 'muslim', name: 'Sahih Muslim' },
  { apiKey: 'abudawud', name: 'Sunan Abu Dawud' },
  { apiKey: 'tirmidhi', name: 'Jami at-Tirmidhi' },
  { apiKey: 'nasai', name: "Sunan an-Nasa'i" },
  { apiKey: 'ibnmajah', name: 'Sunan Ibn Majah' },
  { apiKey: 'malik', name: 'Muwatta Imam Malik' },
  { apiKey: 'nawawi', name: '40 Hadith Nawawi' },
  { apiKey: 'qudsi', name: '40 Hadith Qudsi' },
  { apiKey: 'dehlawi', name: '40 Hadith Shah Waliullah' },
];

// ---------------------------------------------------------------------------
// Pure helpers — shared shape with seed-hadiths.ts
// ---------------------------------------------------------------------------

export function parseCanonicalNumber(
  raw: string | number | null | undefined,
): { number: number; suffix: number } | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = /^(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) return null;
  const number = parseInt(m[1], 10);
  if (!Number.isFinite(number) || number <= 0) return null;
  const suffix = m[2] === undefined ? 1 : parseInt(m[2], 10);
  if (!Number.isFinite(suffix) || suffix <= 0) return null;
  return { number, suffix };
}

function sectionTitleFor(h: any, metadata: any): string | null {
  const sections = metadata?.sections || {};
  const key = h?.reference?.book;
  if (key === undefined || key === null) return null;
  const t = sections[String(key)];
  return t && String(t).trim() ? String(t).trim() : null;
}

function scrub(message: string): string {
  return (message ?? 'unknown error')
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, 'postgres://<redacted>')
    .replace(/password=[^\s&"']+/gi, 'password=<redacted>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJson(url: string, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e: any) {
      if (attempt === retries) throw e;
      await new Promise((res) => setTimeout(res, 2000 * attempt));
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface RowPlan {
  hadithNumber: number;
  canonicalNumber: number | null;
  canonicalSuffix: number | null;
  chapterTitle: string | null;
  chapterTitleArabic: string | null;
  reference: string | null;
}

async function main(): Promise<number> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      'DATABASE_URL is not set. This script reads config exactly like the seed scripts (dotenv).',
    );
    return EXIT_INFRA;
  }

  // `sslmode=require` in the URL makes node-postgres verify the chain, which
  // fails against the RDS/Aiven self-signed cert. Strip it and set ssl here,
  // the same way every other standalone script in this repo does.
  const pool = new Pool({
    connectionString: databaseUrl.replace('sslmode=require', ''),
    ssl: { rejectUnauthorized: false },
  });

  // PrismaPg's `schema` option only qualifies statements the query engine
  // builds. Raw SQL goes out unqualified, so search_path has to be set on the
  // connection or every statement looks in `public` and finds nothing.
  const schema = prismaSchemaOptions(databaseUrl)?.schema;

  const client = await pool.connect().catch((e: any) => {
    console.error(`Could not connect: ${scrub(e.message)}`);
    return null;
  });
  if (!client) {
    await pool.end().catch(() => {});
    return EXIT_INFRA;
  }

  let problems = 0;

  try {
    if (schema) {
      await client.query(`SET search_path TO "${schema}", public`);
    }

    console.log(
      APPLY
        ? '*** APPLY MODE — this will write to the database ***'
        : 'Dry run. Nothing will be written. Re-run with --apply to write.',
    );
    console.log(`schema: ${schema ?? 'public (default)'}\n`);

    const targets = BOOK_FILTER
      ? BOOKS.filter((b) => b.apiKey === BOOK_FILTER)
      : BOOKS;
    if (targets.length === 0) {
      console.error(`Unknown --book=${BOOK_FILTER}`);
      return EXIT_PROBLEM;
    }

    for (const book of targets) {
      const bookRow = await client.query(
        'SELECT id, total_hadiths FROM hadith_books WHERE name = $1',
        [book.name],
      );
      if (bookRow.rowCount === 0) {
        console.log(`${book.name}: not seeded, skipping`);
        continue;
      }
      const bookId = bookRow.rows[0].id;
      const declaredTotal = bookRow.rows[0].total_hadiths;

      const [eng, ara] = await Promise.all([
        fetchJson(`${CDN_BASE}/eng-${book.apiKey}.json`),
        fetchJson(`${CDN_BASE}/ara-${book.apiKey}.json`),
      ]);

      const araBySeq = new Map<number, any>();
      for (const h of ara.hadiths || []) araBySeq.set(h.hadithnumber, h);

      const plan = new Map<number, RowPlan>();
      for (const h of eng.hadiths || []) {
        const canonical = parseCanonicalNumber(h.arabicnumber);
        const araH = araBySeq.get(h.hadithnumber);
        plan.set(h.hadithnumber, {
          hadithNumber: h.hadithnumber,
          canonicalNumber: canonical ? canonical.number : null,
          canonicalSuffix: canonical ? canonical.suffix : null,
          chapterTitle: sectionTitleFor(h, eng.metadata),
          chapterTitleArabic: araH ? sectionTitleFor(araH, ara.metadata) : null,
          reference: canonical ? `${book.name} ${canonical.number}` : null,
        });
      }

      // What is actually stored right now. Deliberately does NOT select
      // `canonical_number`, so a dry run works before the migration that adds
      // it — which is the run you want in order to see the damage first.
      const existing = await client.query(
        'SELECT hadith_number, chapter_title, reference FROM hadiths WHERE book_id = $1',
        [bookId],
      );
      const storedRows = existing.rows;

      let willSetCanonical = 0;
      let willNullCanonical = 0;
      let chapterChanges = 0;
      let refChanges = 0;
      let unplanned = 0;

      for (const r of storedRows) {
        const p = plan.get(r.hadith_number);
        if (!p) {
          unplanned++;
          continue;
        }
        if (p.canonicalNumber !== null) willSetCanonical++;
        else willNullCanonical++;
        if ((r.chapter_title ?? null) !== (p.chapterTitle ?? null))
          chapterChanges++;
        if ((r.reference ?? null) !== (p.reference ?? null)) refChanges++;
      }

      const renumbered = storedRows.filter((r: any) => {
        const p = plan.get(r.hadith_number);
        return p && p.canonicalNumber !== null && p.canonicalNumber !== r.hadith_number;
      }).length;

      console.log(`${book.name}`);
      console.log(
        `  rows=${storedRows.length}  declared total_hadiths=${declaredTotal}` +
          (declaredTotal !== storedRows.length
            ? `  <-- OVERSTATED by ${declaredTotal - storedRows.length}`
            : ''),
      );
      console.log(
        `  canonical number: ${willSetCanonical} to set, ${willNullCanonical} stay NULL (unnumbered upstream)`,
      );
      console.log(
        `  rows whose canonical number differs from the stored hadith_number: ${renumbered}` +
          (renumbered > 0 ? '   <-- MIS-CITED TODAY' : ''),
      );
      console.log(`  chapter_title corrections: ${chapterChanges}`);
      console.log(`  reference-string corrections: ${refChanges}`);
      if (unplanned > 0) {
        console.log(
          `  !! ${unplanned} stored rows have no upstream counterpart (left untouched)`,
        );
        problems++;
      }

      if (VERBOSE && renumbered > 0) {
        const sample = storedRows
          .filter((r: any) => {
            const p = plan.get(r.hadith_number);
            return p && p.canonicalNumber !== null && p.canonicalNumber !== r.hadith_number;
          })
          .slice(0, 5);
        for (const r of sample) {
          const p = plan.get(r.hadith_number)!;
          console.log(
            `    seq ${r.hadith_number} -> canonical ${p.canonicalNumber}.${String(p.canonicalSuffix).padStart(2, '0')}`,
          );
        }
      }

      if (APPLY) {
        // One UPDATE ... FROM (VALUES ...) per batch. Far fewer round trips
        // than row-by-row, and each batch is atomic on its own.
        const entries = storedRows
          .map((r: any) => plan.get(r.hadith_number))
          .filter(Boolean) as RowPlan[];

        const BATCH = 500;
        let written = 0;
        await client.query('BEGIN');
        try {
          for (let i = 0; i < entries.length; i += BATCH) {
            const batch = entries.slice(i, i + BATCH);
            const params: any[] = [bookId];
            const tuples = batch.map((p) => {
              const base = params.length;
              params.push(
                p.hadithNumber,
                p.canonicalNumber,
                p.canonicalSuffix,
                p.chapterTitle,
                p.chapterTitleArabic,
                p.reference,
              );
              return `($${base + 1}::int, $${base + 2}::int, $${base + 3}::int, $${base + 4}::text, $${base + 5}::text, $${base + 6}::text)`;
            });
            const sql = `
              UPDATE hadiths AS h
                 SET canonical_number     = v.canonical_number,
                     canonical_suffix     = v.canonical_suffix,
                     chapter_title        = v.chapter_title,
                     chapter_title_arabic = v.chapter_title_arabic,
                     reference            = v.reference
                FROM (VALUES ${tuples.join(', ')})
                  AS v(hadith_number, canonical_number, canonical_suffix,
                       chapter_title, chapter_title_arabic, reference)
               WHERE h.book_id = $1 AND h.hadith_number = v.hadith_number`;
            const res = await client.query(sql, params);
            written += res.rowCount ?? 0;
          }

          // total_hadiths must describe what is stored, not what was fetched.
          await client.query(
            'UPDATE hadith_books SET total_hadiths = $1 WHERE id = $2',
            [storedRows.length, bookId],
          );

          await client.query('COMMIT');
          console.log(`  ✅ updated ${written} rows, total_hadiths=${storedRows.length}`);
        } catch (e: any) {
          await client.query('ROLLBACK');
          console.error(`  ❌ rolled back: ${scrub(e.message)}`);
          problems++;
        }
      }
      console.log('');
    }
  } catch (e: any) {
    console.error(`Failed: ${scrub(e.message)}`);
    return EXIT_INFRA;
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }

  if (!APPLY) {
    console.log(
      'Dry run complete. Re-run with --apply to write these corrections.',
    );
  }
  return problems > 0 ? EXIT_PROBLEM : EXIT_OK;
}

// Guarded so the pure helpers above can be imported and tested without the
// import itself connecting to a database and running a survey.
if (require.main === module) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((e) => {
      console.error(scrub(e?.message ?? String(e)));
      process.exitCode = EXIT_INFRA;
    });
}
