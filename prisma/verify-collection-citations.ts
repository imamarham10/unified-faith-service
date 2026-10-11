/**
 * verify-collection-citations.ts
 * ---------------------------------------------------------------------------
 * Citation and structure gate for curated collections.
 *
 * The sibling of `prisma/verify-feelings-citations.ts`, extended to
 * `collection_items` as `team/curated-collections-spec.md` §2 requires:
 *
 *   > Every citation number and grading in the tables below is reconstructed
 *   > and unverified. … The gate is the pattern that already exists —
 *   > prisma/verify-feelings-citations.ts — extended to collection items and
 *   > run in CI. **A seed that fails citation verification does not merge.**
 *
 * Two halves, deliberately separable:
 *
 *   STRUCTURE — pure, offline. Sequence contiguity and uniqueness, refType
 *     legality, refType↔field consistency, refType↔faith consistency,
 *     repeatCount >= 1, mandatory citation, mandatory grading on
 *     hadith-warranted items, no da'if item supplying a title or subtitle
 *     (§5.3 rule 3 / §8), reviewStatus legality, occasionConfig shape.
 *     Runs over fixtures under `--self-test`, so the rules are proven with no
 *     database at all.
 *
 *   CORPUS — resolution against the seeded content. Qur'an refs against
 *     `quran_verses` via `@@unique([surahId, verseNumber])`; Gita refs against
 *     `hindu_text_verses` through `HinduText.slug` and
 *     `HinduTextChapter.@@unique([textId, chapterNumber])` — which is exactly
 *     what the §1.3 composite unique makes trustworthy; hadith citations
 *     against `hadiths` + `hadith_books`; `dua` / `stotra` refSlugs against
 *     their tables.
 *
 * A citation into a corpus that is not seeded is reported as UNVERIFIABLE, not
 * counted as a pass — the same bound the feelings verifier draws.
 *
 * READ-ONLY. It never writes, never migrates, never prints DATABASE_URL.
 *
 * Usage:
 *   npm run prisma:verify:collections                # against the database
 *   npm run prisma:verify:collections -- --seed-file # structure of the seed, offline
 *   npm run prisma:verify:collections -- --self-test # offline logic proof
 *   npm run prisma:verify:collections -- --strict    # warnings/unverifiable fail
 *
 * `--seed-file` runs the STRUCTURE half against `prisma/seed-collections.ts`
 * without a database and without executing the seed, so CI can block a bad
 * seed on a machine that has no DATABASE_URL at all. The CORPUS half still
 * needs the database and is reported as UNVERIFIABLE in that mode.
 *
 * Exit codes — identical convention to verify-feelings-citations.ts:
 *   0 = pass, 1 = content failure (or failing self-test),
 *   2 = could not reach / read the database.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import {
  FAITH_IDS,
  GRADINGS,
  OCCASION_TYPES,
  PROVENANCE_CLASSES,
  REF_TYPES,
  REF_TYPE_FAITH,
  REF_TYPE_FIELDS,
  REVIEW_STATUSES,
  SERVABLE_REVIEW_STATUSES,
  WEAK_GRADINGS,
} from '../src/faiths/collections/collection-vocabulary';

const ARGV = process.argv.slice(2);
const SELF_TEST = ARGV.includes('--self-test');
const SEED_FILE_ONLY = ARGV.includes('--seed-file');
const STRICT = ARGV.includes('--strict');

const EXIT_OK = 0;
const EXIT_FAIL = 1;
const EXIT_INFRA = 2;

const BAR = '='.repeat(78);

// ===========================================================================
// 1. Shapes
// ===========================================================================

export interface ItemRow {
  sequence: number;
  refType: string;
  surahId: number | null;
  ayahStart: number | null;
  ayahEnd: number | null;
  hinduTextSlug: string | null;
  chapterNumber: number | null;
  verseStart: number | null;
  verseEnd: number | null;
  refSlug: string | null;
  refId: string | null;
  repeatCount: number;
  label: string;
  note: string | null;
  citation: string;
  grading: string | null;
  isOptional: boolean;
}

export interface CollectionRow {
  slug: string;
  faithId: string;
  title: string;
  subtitle: string | null;
  occasionType: string;
  occasionConfig: any;
  orderSemantics: string;
  provenanceClass: string;
  reviewStatus: string;
  isActive: boolean;
  items: ItemRow[];
}

type Verdict = 'PASS' | 'FAIL' | 'WARN' | 'UNVERIFIABLE';

interface Finding {
  verdict: Verdict;
  where: string;
  detail: string;
}

// ===========================================================================
// 2. Structure — pure, no I/O. This half runs under --self-test.
// ===========================================================================

/** Which occasionConfig key each occasionType family expects (§3.1). */
const OCCASION_CONFIG_KEYS: Record<string, string[]> = {
  nightly: ['clock', 'anchor'],
  morning: ['clock', 'anchor'],
  evening: ['clock', 'anchor'],
  after_prayer: ['anchor'],
  weekday: ['weekday'],
  hijri: ['hijri'],
  panchang: ['panchang'],
  festival: ['festival'],
  situational: ['always'],
  evergreen: ['always'],
};

/**
 * Does this citation name a hadith? If so §5.3 rule 3 makes `grading`
 * mandatory. A Qur'an-only or scripture-only citation does not.
 *
 * Intentionally conservative: it looks for "<word> <number>" with no colon,
 * which is how every hadith citation in §2 is written ("Bukhari 5017"), and
 * excludes verse-style "12.1–20" / "2:255" references.
 */
export function namesAHadith(citation: string): boolean {
  return citation
    .split(/[·|;]|(?:\s+\/\s+)/)
    .map((p) => p.trim())
    .some(
      (part) =>
        /[A-Za-z]/.test(part) &&
        /\b\d{1,6}\b/.test(part) &&
        !/\d\s*[:.]\s*\d/.test(part) &&
        !/^(?:quran|qur'an|surah|sura|bhagavad\s+gita|gita|rig\s+veda|yajur\s+veda)\b/i.test(
          part,
        ),
    );
}

export function checkStructure(collections: CollectionRow[]): Finding[] {
  const findings: Finding[] = [];
  const fail = (where: string, detail: string) =>
    findings.push({ verdict: 'FAIL', where, detail });
  const warn = (where: string, detail: string) =>
    findings.push({ verdict: 'WARN', where, detail });

  const seenSlugs = new Set<string>();

  for (const c of collections) {
    const at = `${c.faithId}/${c.slug}`;

    if (seenSlugs.has(c.slug)) fail(at, 'duplicate collection slug');
    seenSlugs.add(c.slug);

    if (!(FAITH_IDS as readonly string[]).includes(c.faithId)) {
      fail(at, `faithId '${c.faithId}' is not in the vocabulary`);
    }
    if (!(OCCASION_TYPES as readonly string[]).includes(c.occasionType)) {
      fail(at, `occasionType '${c.occasionType}' is not in the vocabulary`);
    }
    if (!(PROVENANCE_CLASSES as readonly string[]).includes(c.provenanceClass)) {
      fail(at, `provenanceClass '${c.provenanceClass}' is not in the vocabulary`);
    }
    if (!(REVIEW_STATUSES as readonly string[]).includes(c.reviewStatus)) {
      fail(at, `reviewStatus '${c.reviewStatus}' is not in the vocabulary`);
    }

    // §5.1 / §8: draft is never served. Not a FAIL — a draft row in the table
    // is the correct state before Tier A — but the operator must be told that
    // the API will return nothing for it.
    if (!SERVABLE_REVIEW_STATUSES.includes(c.reviewStatus as any)) {
      warn(
        at,
        `reviewStatus '${c.reviewStatus}' is not served by the API (§5.1) — ` +
          'Tier A must be completed and the status raised before this is reachable',
      );
    }

    if (c.occasionConfig != null) {
      const expected = OCCASION_CONFIG_KEYS[c.occasionType] ?? [];
      const keys = Object.keys(c.occasionConfig);
      if (expected.length && !keys.some((k) => expected.includes(k))) {
        fail(
          at,
          `occasionConfig has keys [${keys.join(', ')}] but occasionType ` +
            `'${c.occasionType}' expects one of [${expected.join(', ')}] (§3.1)`,
        );
      }
    }

    if (c.items.length === 0) {
      fail(at, 'collection has no items');
      continue;
    }

    // Order is semantic (§1.1). Sequences must be 1..n, contiguous, unique.
    const sequences = c.items.map((i) => i.sequence).sort((a, b) => a - b);
    const unique = new Set(sequences);
    if (unique.size !== sequences.length) {
      fail(at, `duplicate sequence numbers: [${sequences.join(', ')}]`);
    }
    for (let i = 0; i < sequences.length; i++) {
      if (sequences[i] !== i + 1) {
        fail(
          at,
          `sequences are not contiguous 1..${sequences.length}: [${sequences.join(', ')}]`,
        );
        break;
      }
    }

    const titleHaystack = `${c.title} ${c.subtitle ?? ''}`.toLowerCase();

    for (const item of c.items) {
      const iat = `${at} #${item.sequence} (${item.label})`;

      if (!(REF_TYPES as readonly string[]).includes(item.refType)) {
        fail(iat, `refType '${item.refType}' is not in the vocabulary`);
        continue;
      }

      const expectedFaith = REF_TYPE_FAITH[item.refType as keyof typeof REF_TYPE_FAITH];
      if (expectedFaith !== 'any' && expectedFaith !== c.faithId) {
        fail(
          iat,
          `refType '${item.refType}' belongs to faith '${expectedFaith}' but the ` +
            `collection is '${c.faithId}'`,
        );
      }

      const spec = REF_TYPE_FIELDS[item.refType as keyof typeof REF_TYPE_FIELDS];
      for (const field of spec.required) {
        if ((item as any)[field] == null) {
          fail(iat, `refType '${item.refType}' requires '${field}' but it is null`);
        }
      }
      for (const field of spec.forbidden) {
        if ((item as any)[field] != null) {
          fail(
            iat,
            `refType '${item.refType}' must not carry '${field}' ` +
              `(got ${JSON.stringify((item as any)[field])})`,
          );
        }
      }

      // repeatCount is why this model exists (§1.2). A zero or negative count
      // is a seed bug that would render an item that is never recited.
      if (!Number.isInteger(item.repeatCount) || item.repeatCount < 1) {
        fail(iat, `repeatCount must be an integer >= 1, got ${item.repeatCount}`);
      }

      if (!item.label || !item.label.trim()) fail(iat, 'label is empty');

      // §8 release gate: every item has a citation.
      if (!item.citation || !item.citation.trim()) {
        fail(iat, 'citation is empty — every item must carry one (§8)');
      }

      if (item.grading != null && !(GRADINGS as readonly string[]).includes(item.grading)) {
        fail(iat, `grading '${item.grading}' is not in the vocabulary`);
      }

      // §5.3 rule 3 / §8: grading is mandatory on every hadith-warranted item.
      if (item.citation && namesAHadith(item.citation) && !item.grading) {
        fail(
          iat,
          `citation "${item.citation}" names a hadith, so grading is mandatory (§5.3 rule 3)`,
        );
      }

      // §5.3 rule 3 / §8: a da'if item may ship, but may not name the card.
      if (
        item.grading &&
        WEAK_GRADINGS.includes(item.grading as any) &&
        item.label &&
        titleHaystack.includes(item.label.toLowerCase())
      ) {
        fail(
          iat,
          `item is graded '${item.grading}' and its label appears in the collection ` +
            'title/subtitle — a weak narration may not name the card (§5.3 rule 3)',
        );
      }

      // Range sanity — a backwards range resolves to nothing at runtime and
      // would render an empty item rather than an error.
      if (item.ayahStart != null && item.ayahEnd != null && item.ayahEnd < item.ayahStart) {
        fail(iat, `ayah range ${item.ayahStart}-${item.ayahEnd} runs backwards`);
      }
      if (item.verseStart != null && item.verseEnd != null && item.verseEnd < item.verseStart) {
        fail(iat, `verse range ${item.verseStart}-${item.verseEnd} runs backwards`);
      }
      if (item.surahId != null && (item.surahId < 1 || item.surahId > 114)) {
        fail(iat, `surah ${item.surahId} is outside the Qur'an (1-114)`);
      }

      // §1.2: seeds must prefer refSlug. A uuid is not reproducible.
      if (item.refId && !item.refSlug && item.refType !== 'allah_name') {
        warn(
          iat,
          'addressed by refId (uuid) with no refSlug — not reproducible across ' +
            'environments (§1.2)',
        );
      }
    }
  }

  return findings;
}

// ===========================================================================
// 2b. Reading the seed file without running it
// ===========================================================================

/**
 * Slice a top-level array literal out of a TS source file by bracket matching.
 *
 * Same technique, and same reason, as `verify-feelings-citations.ts`:
 * `seed-collections.ts` has no exports, builds a `PrismaClient` at module
 * scope and calls `main()` on load, so `import`ing it would open a connection
 * and execute a seed (a write). The literal is pure data, so lifting the text
 * out and evaluating just that is safe and side-effect free.
 *
 * That script is standalone with no exports of its own, so this is a
 * deliberate copy rather than an import. If either copy is fixed, fix both.
 */
function extractArrayLiteral(src: string, declName: string): string {
  const re = new RegExp(
    `(?:const|let|var)\\s+${declName}\\s*(?::[^=]*)?=\\s*\\[`,
  );
  const m = re.exec(src);
  if (!m) {
    throw new Error(
      `could not find a "${declName}" array literal — the seed file's shape changed`,
    );
  }

  const start = m.index + m[0].length - 1; // index of the opening '['
  let depth = 0;
  let i = start;

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    if (ch === '/' && next === '/') {
      i = src.indexOf('\n', i);
      if (i === -1) break;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === quote) break;
        i++;
      }
      i++;
      continue;
    }

    if (ch === '[' || ch === '{') depth++;
    if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
    i++;
  }

  throw new Error(`unbalanced brackets while reading "${declName}"`);
}

/**
 * The seed's `CollectionSeed[]` normalised into the row shape the structural
 * checks take. Optional fields become `null`, exactly as the seed writes them.
 * `reviewStatus` is the seed's own per-collection value, falling back to
 * `draft` — that is what a plain `npm run prisma:seed:collections` writes on
 * create.
 */
export function loadSeedFile(file: string): CollectionRow[] {
  const src = fs.readFileSync(file, 'utf8');
  const literal = extractArrayLiteral(src, 'COLLECTIONS');
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const seeds = new Function(`"use strict"; return (${literal});`)() as any[];

  return seeds.map((s) => ({
    slug: s.slug,
    faithId: s.faithId,
    title: s.title,
    subtitle: s.subtitle ?? null,
    occasionType: s.occasionType,
    occasionConfig: s.occasionConfig ?? null,
    orderSemantics: s.orderSemantics ?? 'sequence',
    provenanceClass: s.provenanceClass,
    // The seed's own per-collection value, which is what a plain run writes on
    // create. `nightly-recitation` and `gita-daily` carry `self_reviewed`
    // there; everything else defaults to `draft`.
    reviewStatus: s.reviewStatus ?? 'draft',
    isActive: true,
    items: (s.items ?? []).map((i: any) => ({
      sequence: i.sequence,
      refType: i.refType,
      surahId: i.surahId ?? null,
      ayahStart: i.ayahStart ?? null,
      ayahEnd: i.ayahEnd ?? null,
      hinduTextSlug: i.hinduTextSlug ?? null,
      chapterNumber: i.chapterNumber ?? null,
      verseStart: i.verseStart ?? null,
      verseEnd: i.verseEnd ?? null,
      refSlug: i.refSlug ?? null,
      refId: i.refId ?? null,
      repeatCount: i.repeatCount,
      label: i.label,
      note: i.note ?? null,
      citation: i.citation,
      grading: i.grading ?? null,
      isOptional: i.isOptional ?? false,
    })),
  }));
}

// ===========================================================================
// 3. Corpus — resolution against the seeded content (database only)
// ===========================================================================

interface Corpus {
  describe(): string;
  surah(id: number): Promise<{ verseCount: number; seeded: number } | null>;
  quranVerseNumbers(surahId: number, from: number, to: number): Promise<number[]>;
  hinduChapter(
    textSlug: string,
    chapterNumber: number,
  ): Promise<{ chapterId: string } | null>;
  hinduVerseNumbers(chapterId: string, from: number, to: number): Promise<number[]>;
  hadithBooks(): Promise<Array<{ id: string; name: string; seeded: number }>>;
  hadithExists(bookId: string, number: number): Promise<boolean>;
  duaSlugExists(slug: string): Promise<boolean>;
  stotraSlugExists(slug: string): Promise<boolean>;
  collections(): Promise<CollectionRow[]>;
  close(): Promise<void>;
}

async function openDatabaseCorpus(): Promise<Corpus> {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');
  const { prismaSchemaOptions } = require('../src/common/utils/db-schema');
  /* eslint-enable @typescript-eslint/no-var-requires */

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  const pool = new Pool({
    connectionString: databaseUrl.replace('sslmode=require', ''),
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 10000,
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool, prismaSchemaOptions(databaseUrl)),
  });

  return {
    describe: () => 'the database',

    async collections() {
      const rows = await prisma.collection.findMany({
        orderBy: [{ faithId: 'asc' }, { slug: 'asc' }],
        include: { items: { orderBy: { sequence: 'asc' } } },
      });
      return rows as CollectionRow[];
    },

    async surah(id: number) {
      const surah = await prisma.quranSurah.findUnique({ where: { id } });
      if (!surah) return null;
      const seeded = await prisma.quranVerse.count({ where: { surahId: id } });
      return { verseCount: surah.verseCount, seeded };
    },

    async quranVerseNumbers(surahId: number, from: number, to: number) {
      const rows = await prisma.quranVerse.findMany({
        where: { surahId, verseNumber: { gte: from, lte: to } },
        select: { verseNumber: true },
      });
      return rows.map((r: any) => r.verseNumber);
    },

    async hinduChapter(textSlug: string, chapterNumber: number) {
      const text = await prisma.hinduText.findUnique({
        where: { slug: textSlug },
        select: { id: true },
      });
      if (!text) return null;
      const chapter = await prisma.hinduTextChapter.findUnique({
        where: { textId_chapterNumber: { textId: text.id, chapterNumber } },
        select: { id: true },
      });
      return chapter ? { chapterId: chapter.id } : null;
    },

    async hinduVerseNumbers(chapterId: string, from: number, to: number) {
      const rows = await prisma.hinduTextVerse.findMany({
        where: { chapterId, verseNumber: { gte: from, lte: to } },
        select: { verseNumber: true },
      });
      return rows.map((r: any) => r.verseNumber);
    },

    async hadithBooks() {
      const books = await prisma.hadithBook.findMany({
        select: { id: true, name: true, _count: { select: { hadiths: true } } },
      });
      return books.map((b: any) => ({
        id: b.id,
        name: b.name,
        seeded: b._count.hadiths,
      }));
    },

    async hadithExists(bookId: string, number: number) {
      const hit = await prisma.hadith.findUnique({
        where: { bookId_hadithNumber: { bookId, hadithNumber: number } },
        select: { id: true },
      });
      return Boolean(hit);
    },

    async duaSlugExists(slug: string) {
      const hit = await prisma.dua.findUnique({
        where: { slug },
        select: { id: true },
      });
      return Boolean(hit);
    },

    async stotraSlugExists(slug: string) {
      const hit = await prisma.stotra.findUnique({
        where: { slug },
        select: { id: true },
      });
      return Boolean(hit);
    },

    async close() {
      await prisma.$disconnect().catch(() => undefined);
      await pool.end().catch(() => undefined);
    },
  };
}

/**
 * Hadith collection aliases. Folded onto `HadithBook.name` the same way
 * verify-feelings-citations.ts does, except that the canonical names are read
 * from the database rather than from a seed file — this script already has a
 * connection, and reading the real rows cannot drift from them.
 */
const BOOK_ALIASES: Record<string, string[]> = {
  bukhari: ['bukhari'],
  muslim: ['muslim'],
  tirmidhi: ['tirmidhi', 'tirmizi'],
  'abu dawud': ['abu dawud', 'abu daud', 'abu dawood', 'abi dawud'],
  'ibn majah': ['ibn majah', 'ibn maja'],
  nasai: ['nasai', "nasa'i", 'nasae'],
  ahmad: ['ahmad', 'musnad ahmad'],
  malik: ['malik', 'muwatta'],
};

/** "Bukhari 5009 · Muslim 807" -> [{book:'Bukhari', number:5009}, …] */
export function parseHadithCitations(
  citation: string,
): Array<{ raw: string; book: string; number: number }> {
  return citation
    .split(/[·|;]|(?:\s+\/\s+)/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => {
      // Skip verse-style refs ("2:255", "Bhagavad Gita 12.1–20").
      if (/\d\s*[:.]\s*\d/.test(part)) return null;
      const m = /^(.*?[^\s\d])\s*(?:no\.?|#)?\s*(\d{1,6})\s*$/i.exec(part);
      if (!m) return null;
      const book = m[1].trim().replace(/[,:]$/, '').trim();
      if (!book || /^(?:quran|qur'an|surah|sura)$/i.test(book)) return null;
      return { raw: part, book, number: Number.parseInt(m[2], 10) };
    })
    .filter(Boolean) as Array<{ raw: string; book: string; number: number }>;
}

async function checkCorpus(
  collections: CollectionRow[],
  corpus: Corpus,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const push = (verdict: Verdict, where: string, detail: string) =>
    findings.push({ verdict, where, detail });

  const books = await corpus.hadithBooks();
  const resolveBook = (needle: string) => {
    const folded = needle.toLowerCase().replace(/[^a-z\s']/g, '').trim();
    for (const [canon, aliases] of Object.entries(BOOK_ALIASES)) {
      if (aliases.some((a) => folded.includes(a))) {
        const hit = books.find((b) => b.name.toLowerCase().includes(canon));
        if (hit) return hit;
        return { id: null as any, name: canon, seeded: 0 };
      }
    }
    return books.find((b) => b.name.toLowerCase().includes(folded)) ?? null;
  };

  for (const c of collections) {
    for (const item of c.items) {
      const at = `${c.faithId}/${c.slug} #${item.sequence} (${item.label})`;

      // --- the reference itself -------------------------------------------
      if (item.refType === 'surah' || item.refType === 'ayah_range') {
        const surah = item.surahId != null ? await corpus.surah(item.surahId) : null;
        if (!surah) {
          push('FAIL', at, `surah ${item.surahId} is not seeded in quran_surahs`);
        } else if (item.refType === 'surah') {
          if (surah.seeded !== surah.verseCount) {
            push(
              'FAIL',
              at,
              `surah ${item.surahId} declares ${surah.verseCount} verses but ` +
                `${surah.seeded} are seeded — a whole-surah item would render incomplete`,
            );
          } else {
            push('PASS', at, `surah ${item.surahId}, ${surah.seeded} verses seeded`);
          }
        } else {
          const from = item.ayahStart!;
          const to = item.ayahEnd ?? from;
          if (to > surah.verseCount) {
            push(
              'FAIL',
              at,
              `${item.surahId}:${from}-${to} runs past the end of the surah ` +
                `(${surah.verseCount} verses)`,
            );
          } else {
            const found = await corpus.quranVerseNumbers(item.surahId!, from, to);
            const expected = to - from + 1;
            if (found.length !== expected) {
              const missing: number[] = [];
              for (let n = from; n <= to; n++) {
                if (!found.includes(n)) missing.push(n);
              }
              push(
                'FAIL',
                at,
                `${item.surahId}:${from}-${to} expects ${expected} verse(s), ` +
                  `${found.length} seeded (missing ${missing.join(', ')})`,
              );
            } else {
              push('PASS', at, `${item.surahId}:${from}-${to}, ${expected} verse(s) seeded`);
            }
          }
        }
      } else if (item.refType === 'hindu_verse_range') {
        const chapter = await corpus.hinduChapter(
          item.hinduTextSlug!,
          item.chapterNumber!,
        );
        if (!chapter) {
          push(
            'FAIL',
            at,
            `${item.hinduTextSlug} chapter ${item.chapterNumber} is not seeded`,
          );
        } else {
          const from = item.verseStart!;
          const to = item.verseEnd ?? from;
          const found = await corpus.hinduVerseNumbers(chapter.chapterId, from, to);
          const expected = to - from + 1;
          if (found.length !== expected) {
            const missing: number[] = [];
            for (let n = from; n <= to; n++) {
              if (!found.includes(n)) missing.push(n);
            }
            push(
              'FAIL',
              at,
              `${item.hinduTextSlug} ${item.chapterNumber}:${from}-${to} expects ` +
                `${expected} verse(s), ${found.length} seeded (missing ${missing.join(', ')})`,
            );
          } else if (new Set(found).size !== found.length) {
            // Only reachable while 20261011121000_add_hindu_text_verse_unique
            // has not been applied, or on null-chapter rows it cannot bind.
            push(
              'FAIL',
              at,
              `${item.hinduTextSlug} ${item.chapterNumber}:${from}-${to} has DUPLICATE ` +
                'verse rows — run npm run prisma:check:hindu-verse-dupes',
            );
          } else {
            push(
              'PASS',
              at,
              `${item.hinduTextSlug} ${item.chapterNumber}:${from}-${to}, ${expected} verse(s) seeded`,
            );
          }
        }
      } else if (item.refType === 'dua') {
        if (!item.refSlug) {
          push('FAIL', at, 'dua item has no refSlug');
        } else if (await corpus.duaSlugExists(item.refSlug)) {
          push('PASS', at, `dua '${item.refSlug}' resolves`);
        } else {
          push(
            'FAIL',
            at,
            `dua '${item.refSlug}' does not resolve — has seed-duas-complete.ts ` +
              'back-filled Dua.slug in this environment?',
          );
        }
      } else if (item.refType === 'stotra') {
        if (!item.refSlug) {
          push('FAIL', at, 'stotra item has no refSlug');
        } else if (await corpus.stotraSlugExists(item.refSlug)) {
          push('PASS', at, `stotra '${item.refSlug}' resolves`);
        } else {
          push('FAIL', at, `stotra '${item.refSlug}' is not seeded`);
        }
      } else {
        push(
          'UNVERIFIABLE',
          at,
          `refType '${item.refType}' has no seeded corpus in this schema — ` +
            'the reference cannot be checked',
        );
      }

      // --- the citation string --------------------------------------------
      for (const ref of parseHadithCitations(item.citation)) {
        const book = resolveBook(ref.book);
        if (!book) {
          push(
            'FAIL',
            at,
            `citation "${ref.raw}" names a collection this schema does not know`,
          );
          continue;
        }
        if (!book.id || book.seeded === 0) {
          push(
            'UNVERIFIABLE',
            at,
            `citation "${ref.raw}" — ${book.name} is not seeded, so the hadith ` +
              'number cannot be checked against a primary source',
          );
          continue;
        }
        if (await corpus.hadithExists(book.id, ref.number)) {
          push('PASS', at, `citation "${ref.raw}" resolves in ${book.name}`);
        } else {
          push(
            'FAIL',
            at,
            `citation "${ref.raw}" — no hadith ${ref.number} in ${book.name} ` +
              `(${book.seeded} seeded)`,
          );
        }
      }
    }
  }

  return findings;
}

// ===========================================================================
// 4. Reporting
// ===========================================================================

function report(findings: Finding[], corpusLabel: string): number {
  const by = (v: Verdict) => findings.filter((f) => f.verdict === v);
  const failures = by('FAIL');
  const warnings = by('WARN');
  const unverifiable = by('UNVERIFIABLE');
  const passes = by('PASS');

  console.log('');
  console.log(BAR);
  console.log('  Collection citation & structure verification');
  console.log(`  corpus: ${corpusLabel}`);
  console.log(BAR);

  const line = (f: Finding) => `    ${f.where}\n        ${f.detail}`;

  if (failures.length) {
    console.log(`\nFAILED (${failures.length}) — these must be fixed before shipping`);
    for (const f of failures) console.log(line(f));
  }
  if (unverifiable.length) {
    console.log(
      `\nUNVERIFIABLE (${unverifiable.length}) — corpus not seeded; NOT counted as a pass`,
    );
    for (const f of unverifiable) console.log(line(f));
  }
  if (warnings.length) {
    console.log(`\nWARNINGS (${warnings.length})`);
    for (const f of warnings) console.log(line(f));
  }
  if (passes.length) {
    console.log(`\nPASSED (${passes.length})`);
    for (const f of passes) console.log(line(f));
  }

  console.log('');
  console.log(BAR);
  console.log(
    `  ${passes.length} passed · ${failures.length} failed · ` +
      `${unverifiable.length} unverifiable · ${warnings.length} warnings`,
  );
  if (STRICT) {
    console.log('  --strict: warnings and unverifiable findings count as failures.');
  }
  console.log(BAR);
  console.log('');

  const blocking =
    failures.length + (STRICT ? warnings.length + unverifiable.length : 0);
  return blocking === 0 ? EXIT_OK : EXIT_FAIL;
}

// ===========================================================================
// 5. Self-test — proves the structural rules with no database
// ===========================================================================

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  sequence: 1,
  refType: 'surah',
  surahId: 112,
  ayahStart: null,
  ayahEnd: null,
  hinduTextSlug: null,
  chapterNumber: null,
  verseStart: null,
  verseEnd: null,
  refSlug: null,
  refId: null,
  repeatCount: 3,
  label: 'Al-Ikhlas',
  note: null,
  citation: 'Bukhari 5017',
  grading: 'sahih',
  isOptional: false,
  ...over,
});

const collection = (over: Partial<CollectionRow> = {}): CollectionRow => ({
  slug: 'nightly-recitation',
  faithId: 'islam',
  title: 'Nightly Recitation',
  subtitle: 'Before sleep',
  occasionType: 'nightly',
  occasionConfig: { clock: { from: '20:00', to: '03:59' } },
  orderSemantics: 'sequence',
  provenanceClass: 'transmitted',
  reviewStatus: 'self_reviewed',
  isActive: true,
  items: [item()],
  ...over,
});

function runSelfTest(): number {
  const failsWith = (c: CollectionRow, needle: string) =>
    checkStructure([c]).some(
      (f) => f.verdict === 'FAIL' && f.detail.includes(needle),
    );
  const clean = (c: CollectionRow) =>
    checkStructure([c]).every((f) => f.verdict !== 'FAIL');

  const cases: Array<{ what: string; ok: boolean }> = [
    { what: 'a well-formed collection produces no failures', ok: clean(collection()) },
    {
      what: 'non-contiguous sequences fail',
      ok: failsWith(
        collection({ items: [item({ sequence: 1 }), item({ sequence: 3 })] }),
        'not contiguous',
      ),
    },
    {
      what: 'duplicate sequences fail',
      ok: failsWith(
        collection({ items: [item({ sequence: 1 }), item({ sequence: 1 })] }),
        'duplicate sequence',
      ),
    },
    {
      what: 'repeatCount of 0 fails',
      ok: failsWith(collection({ items: [item({ repeatCount: 0 })] }), 'repeatCount'),
    },
    {
      what: 'an unknown refType fails',
      ok: failsWith(collection({ items: [item({ refType: 'playlist' })] }), 'refType'),
    },
    {
      what: 'a surah item carrying a hinduTextSlug fails',
      ok: failsWith(
        collection({ items: [item({ hinduTextSlug: 'bhagavad-gita' })] }),
        'must not carry',
      ),
    },
    {
      what: 'a Hindu collection holding a surah item fails',
      ok: failsWith(
        collection({ faithId: 'hindu', slug: 'x', items: [item()] }),
        "belongs to faith 'islam'",
      ),
    },
    {
      what: 'an ayah_range with no ayahStart fails',
      ok: failsWith(
        collection({ items: [item({ refType: 'ayah_range', ayahStart: null })] }),
        "requires 'ayahStart'",
      ),
    },
    {
      what: 'a backwards ayah range fails',
      ok: failsWith(
        collection({
          items: [item({ refType: 'ayah_range', ayahStart: 286, ayahEnd: 285 })],
        }),
        'runs backwards',
      ),
    },
    {
      what: 'an empty citation fails',
      ok: failsWith(collection({ items: [item({ citation: '  ' })] }), 'citation is empty'),
    },
    {
      what: 'a hadith-warranted item with no grading fails (§5.3 rule 3)',
      ok: failsWith(
        collection({ items: [item({ citation: 'Bukhari 5017', grading: null })] }),
        'grading is mandatory',
      ),
    },
    {
      what: 'a Gita verse citation does NOT demand a hadith grading',
      ok:
        !namesAHadith('Bhagavad Gita 12.1–20') &&
        clean(
          collection({
            faithId: 'hindu',
            slug: 'gita-daily',
            title: 'Daily Gita',
            subtitle: null,
            occasionType: 'evergreen',
            occasionConfig: { always: true },
            provenanceClass: 'assembled',
            items: [
              item({
                refType: 'hindu_verse_range',
                surahId: null,
                hinduTextSlug: 'bhagavad-gita',
                chapterNumber: 12,
                verseStart: 1,
                verseEnd: 20,
                repeatCount: 1,
                label: 'Bhagavad Gita 12 — Bhakti Yoga',
                citation: 'Bhagavad Gita 12.1–20',
                grading: null,
              }),
            ],
          }),
        ),
    },
    {
      what: "a da'if item whose label names the card fails (§5.3 rule 3)",
      ok: failsWith(
        collection({
          title: 'Al-Waqi‘ah Nightly',
          items: [
            item({
              label: 'Al-Waqi‘ah',
              citation: 'Ibn Majah 1799',
              grading: 'daif',
            }),
          ],
        }),
        'may not name the card',
      ),
    },
    {
      what: "a da'if item that does NOT name the card is allowed to ship",
      ok: clean(
        collection({
          items: [
            item({ label: 'Al-Waqi‘ah', citation: 'Ibn Majah 1799', grading: 'daif' }),
          ],
        }),
      ),
    },
    {
      what: 'an occasionConfig that does not match the occasionType fails (§3.1)',
      ok: failsWith(
        collection({ occasionConfig: { weekday: { iso: 5 } } }),
        'occasionConfig has keys',
      ),
    },
    {
      what: 'a draft collection warns that the API will not serve it (§5.1)',
      ok: checkStructure([collection({ reviewStatus: 'draft' })]).some(
        (f) => f.verdict === 'WARN' && f.detail.includes('not served'),
      ),
    },
    {
      what: 'an empty collection fails',
      ok: failsWith(collection({ items: [] }), 'no items'),
    },
    {
      what: 'a uuid-addressed item warns about reproducibility (§1.2)',
      ok: checkStructure([
        collection({
          items: [
            item({
              refType: 'text',
              surahId: null,
              refSlug: null,
              refId: '7e8c8c2c-242b-482e-b899-9cf72ffe790f',
              citation: 'Hisn al-Muslim',
              grading: null,
            }),
          ],
        }),
      ]).some((f) => f.verdict === 'WARN' && f.detail.includes('not reproducible')),
    },
    {
      what: 'a slug-addressed item does NOT warn about reproducibility',
      ok: !checkStructure([
        collection({
          items: [
            item({
              refType: 'dua',
              surahId: null,
              refSlug: 'morning-supplication',
              refId: '7e8c8c2c-242b-482e-b899-9cf72ffe790f',
              citation: 'Muslim 2088',
              grading: 'sahih',
            }),
          ],
        }),
      ]).some((f) => f.verdict === 'WARN' && f.detail.includes('not reproducible')),
    },
    {
      what: 'parseHadithCitations splits a compound citation',
      ok: (() => {
        const parsed = parseHadithCitations('Bukhari 5009 · Muslim 807');
        return (
          parsed.length === 2 &&
          parsed[0].book.toLowerCase() === 'bukhari' &&
          parsed[0].number === 5009 &&
          parsed[1].number === 807
        );
      })(),
    },
    {
      what: 'parseHadithCitations ignores a Gita verse reference',
      ok: parseHadithCitations('Bhagavad Gita 12.1–20').length === 0,
    },
  ];

  console.log('');
  console.log(BAR);
  console.log('  SELF-TEST — structural rules and citation parsing');
  console.log('  (fixtures only; no database connection)');
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
  return failed === 0 ? EXIT_OK : EXIT_FAIL;
}

// ===========================================================================
// 6. Entry point
// ===========================================================================

async function main(): Promise<number> {
  if (SELF_TEST) return runSelfTest();

  if (SEED_FILE_ONLY) {
    const file = path.join(__dirname, 'seed-collections.ts');
    let collections: CollectionRow[];
    try {
      collections = loadSeedFile(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n  Could not read prisma/seed-collections.ts: ${message}\n`);
      return EXIT_INFRA;
    }
    const findings = checkStructure(collections);
    // Every reference is a corpus claim this mode cannot check.
    for (const c of collections) {
      for (const i of c.items) {
        findings.push({
          verdict: 'UNVERIFIABLE',
          where: `${c.faithId}/${c.slug} #${i.sequence} (${i.label})`,
          detail:
            'reference and citation not resolved — --seed-file checks structure ' +
            'only; run without it, against a database, for the corpus half',
        });
      }
    }
    return report(
      findings,
      `prisma/seed-collections.ts (${collections.length} collections, structure only)`,
    );
  }

  let corpus: Corpus;
  try {
    corpus = await openDatabaseCorpus();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('');
    console.error(BAR);
    console.error('  COULD NOT OPEN THE DATABASE — nothing was verified.');
    console.error(`  ${message}`);
    console.error('');
    console.error(
      '  Run with --self-test to exercise the structural rules offline.',
    );
    console.error(BAR);
    console.error('');
    return EXIT_INFRA;
  }

  try {
    const collections = await corpus.collections();
    if (collections.length === 0) {
      console.log('\n  No collections in the database. Run: npm run prisma:seed:collections\n');
      return EXIT_OK;
    }
    const findings = [
      ...checkStructure(collections),
      ...(await checkCorpus(collections, corpus)),
    ];
    return report(findings, corpus.describe());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n  Verification could not complete: ${message}\n`);
    return EXIT_INFRA;
  } finally {
    await corpus.close();
  }
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
