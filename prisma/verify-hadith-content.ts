/**
 * verify-hadith-content.ts
 * ---------------------------------------------------------------------------
 * Content gate for the seeded hadith corpus.
 *
 * WHAT THIS ADDS THAT THE OTHER TWO VERIFIERS DID NOT HAVE
 *
 * `verify-feelings-citations.ts` and `verify-collection-citations.ts` both
 * prove that a cited hadith number *resolves* — that some row exists under
 * that number. Neither proves the row is the hadith the citation names. That
 * gap is precisely how the Sahih Muslim mis-numbering survived: the seeder
 * stored a sequential narration index as the citation number, so "Muslim 807"
 * resolved happily — to a hadith about a dead goat given in charity, when
 * Muslim 807 is the hadith that the last two verses of al-Baqara suffice a
 * man at night. A citation that resolves but misattributes is worse than one
 * that fails, because nothing surfaces it.
 *
 * So this script pins a handful of citations whose content is known, and
 * checks the stored text actually says what it should:
 *
 *   FIXTURES    — pinned (collection, number) -> distinctive phrases that must
 *                 appear in the stored English. Phrases are given as groups of
 *                 alternatives, so a different translator's wording still
 *                 passes while a different *hadith* still fails. Some fixtures
 *                 also carry phrases that must NOT appear — the specific wrong
 *                 hadith the old numbering returned — which turns "we fixed
 *                 it" into something a machine can confirm.
 *
 *   CHAPTERS    — a structural smell test. No large collection should have one
 *                 chapter swallowing a third of its rows. This is what would
 *                 have caught the second defect found alongside the numbering
 *                 one: overlapping `section_details` ranges in the upstream
 *                 metadata meant 76% of Sahih Muslim was labelled "The Book of
 *                 Virtues" and 41 of its 57 sections disappeared.
 *
 *   TOTALS      — `hadith_books.total_hadiths` must equal the rows actually
 *                 stored. It was seeded from the *fetched* count, so four
 *                 books overstated their own contents.
 *
 * RESOLUTION RULE. A citation resolves against `canonical_number` (lowest
 * `canonical_suffix` — the primary narration) when that column is populated,
 * and falls back to `hadith_number` otherwise. The fallback is what makes this
 * script meaningful before the fix is applied: run it against a corpus that
 * has not been backfilled and the Muslim fixtures fail, loudly.
 *
 * READ-ONLY. It never writes, never migrates, never prints DATABASE_URL.
 *
 * Usage:
 *   npm run prisma:verify:hadiths                 # against the database
 *   npm run prisma:verify:hadiths -- --self-test  # offline logic proof, no DB
 *   npm run prisma:verify:hadiths -- --verbose
 *
 * Exit codes: 0 = clean, 1 = content failures (or a failing self-test),
 *             2 = could not reach / read the database.
 */

import 'dotenv/config';

// ===========================================================================
// 0. CLI
// ===========================================================================

const ARGV = process.argv.slice(2);
const SELF_TEST = ARGV.includes('--self-test');
const VERBOSE = ARGV.includes('--verbose');

const EXIT_OK = 0;
const EXIT_FAILURES = 1;
const EXIT_INFRA = 2;

// ===========================================================================
// 1. Fixtures — pinned citations with known content
// ===========================================================================

export interface HadithFixture {
  /** Must match HadithBook.name exactly. */
  collection: string;
  /** The number a reader would cite. */
  number: number;
  /** Human description, printed in the report. */
  subject: string;
  /**
   * Every group must be satisfied; within a group any one alternative will
   * do. Groups let a fixture survive translation variance ("suffice him" /
   * "sufficient for him") without going so loose that a different hadith
   * would pass.
   */
  mustContainAny: string[][];
  /**
   * Phrases that must NOT appear — in practice, the distinctive wording of
   * the wrong hadith the defective numbering used to return. A fixture with
   * one of these is a regression test, not just an assertion.
   */
  mustNotContain?: string[];
}

export const HADITH_FIXTURES: HadithFixture[] = [
  // --- Sahih Muslim: the four citations the mis-numbering was measured on. --
  // Each `mustNotContain` is the hadith that the sequential numbering served
  // under this number before the fix.
  {
    collection: 'Sahih Muslim',
    number: 807,
    subject: 'the last two verses of al-Baqara suffice him at night',
    mustContainAny: [
      ['surah al-baqara', 'surat al-baqara', 'al-baqarah'],
      ['two verses', 'two (concluding verses', 'last two'],
      ['suffice', 'sufficient'],
    ],
    mustNotContain: ['dead goat'],
  },
  {
    collection: 'Sahih Muslim',
    number: 2577,
    subject: 'hadith qudsi — "I have forbidden oppression for Myself"',
    mustContainAny: [
      ['forbidden oppression for myself', 'forbade oppression for myself'],
      ['my servants', 'o my servants'],
    ],
    mustNotContain: ['kiss', 'fasting'],
  },
  {
    collection: 'Sahih Muslim',
    number: 918,
    subject: "the Umm Salama du'a on being stricken by calamity",
    mustContainAny: [
      ['umm salama', 'umm salamah'],
      ['calamity', 'affliction', 'misfortune'],
      ['we belong to allah', 'inna lillahi'],
    ],
    mustNotContain: ['utters amin', 'utter amin'],
  },
  {
    collection: 'Sahih Muslim',
    number: 19,
    subject: "Mu'adh sent to Yemen",
    mustContainAny: [
      ["mu'adh", 'muadh'],
      ['yemen'],
      ['people of the book'],
    ],
  },

  // --- The collections content-checked and found canonical. These are the ---
  // --- control group: they must stay green through any re-numbering work. ---
  {
    collection: 'Sahih al-Bukhari',
    number: 5017,
    subject: 'blowing into cupped hands with the three quls before sleep',
    mustContainAny: [
      ['al-ikhlas', 'ikhlas'],
      ['al-falaq', 'falaq'],
      ['an-nas', 'nas'],
      ['bed', 'sleep'],
    ],
  },
  {
    collection: 'Sahih al-Bukhari',
    number: 5009,
    subject: 'the last two verses of al-Baqara suffice him at night',
    mustContainAny: [
      ['al-baqara', 'al-baqarah'],
      ['last two verses', 'two verses'],
      ['sufficient', 'suffice'],
    ],
  },
  {
    collection: 'Sahih al-Bukhari',
    number: 2311,
    subject: 'Abu Huraira, the thief of the zakat and Ayat al-Kursi',
    mustContainAny: [
      ['abu huraira', 'abu hurairah'],
      ['sadaqat', 'sadaqa', 'zakat'],
      ['ramadan'],
    ],
  },
  {
    collection: 'Sahih al-Bukhari',
    number: 1303,
    subject: 'the death of Ibrahim and the tears of the Prophet',
    mustContainAny: [
      ['ibrahim'],
      ['tears', 'shedding tears', 'weep'],
    ],
  },
  {
    collection: 'Jami at-Tirmidhi',
    number: 2891,
    subject: 'Surat al-Mulk — thirty verses that intercede',
    mustContainAny: [
      ['thirty ayat', 'thirty verses'],
      ['intercede'],
      ['forgiven'],
    ],
  },
  {
    collection: 'Sunan Abu Dawud',
    number: 1400,
    subject: 'Surat al-Mulk — thirty verses that intercede',
    mustContainAny: [
      ['thirty verses', 'thirty ayat'],
      ['intercede'],
      ['forgiven'],
    ],
  },
  {
    collection: "Sunan an-Nasa'i",
    number: 1984,
    subject: "the funeral prayer du'a of 'Awf bin Malik",
    mustContainAny: [
      ['funeral prayer', 'funeral'],
      ['awf bin malik', "'awf bin malik", 'awf b. malik'],
      ['allahummaghfir lahu', 'ghfir lahu'],
    ],
  },
  {
    collection: 'Sunan Ibn Majah',
    number: 1598,
    subject: 'the Umm Salama du’a on being stricken by calamity',
    mustContainAny: [
      ['umm salamah', 'umm salama'],
      ['calamity', 'affliction'],
      ['inna lillahi', 'to allah we belong'],
    ],
  },
];

// ===========================================================================
// 2. Matching
// ===========================================================================

/**
 * Fold English hadith text to something comparable.
 *
 * Translations differ in punctuation, honorific glyphs (ﷺ), curly quotes and
 * transliteration apostrophes, none of which should decide whether a fixture
 * matches. Letters, digits and single spaces survive; everything else goes.
 */
export function foldEnglish(input: string): string {
  return (input ?? '')
    .normalize('NFKD')
    // strip combining marks left by NFKD
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Arabic honorific glyphs and anything outside basic latin/digits
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export type FixtureVerdict =
  | 'MATCH'
  | 'WRONG_HADITH'
  | 'NOT_RESOLVED'
  | 'NO_TEXT'
  | 'COLLECTION_ABSENT';

export interface FixtureOutcome {
  fixture: HadithFixture;
  verdict: FixtureVerdict;
  /** Which column the citation resolved through. */
  via: 'canonical' | 'sequential' | 'none';
  missingGroups: string[][];
  forbiddenHit: string[];
  sample: string;
}

/**
 * Decide whether stored text is the hadith the fixture names.
 *
 * Pure. The self-test drives this directly, which is what lets the matcher be
 * proven with no database at all.
 */
export function matchFixture(
  fixture: HadithFixture,
  storedEnglish: string | null | undefined,
): {
  verdict: 'MATCH' | 'WRONG_HADITH' | 'NO_TEXT';
  missingGroups: string[][];
  forbiddenHit: string[];
} {
  const text = foldEnglish(storedEnglish ?? '');
  if (!text) {
    return { verdict: 'NO_TEXT', missingGroups: [], forbiddenHit: [] };
  }

  const missingGroups = fixture.mustContainAny.filter(
    (group) => !group.some((alt) => text.includes(foldEnglish(alt))),
  );
  const forbiddenHit = (fixture.mustNotContain ?? []).filter((bad) =>
    text.includes(foldEnglish(bad)),
  );

  const ok = missingGroups.length === 0 && forbiddenHit.length === 0;
  return {
    verdict: ok ? 'MATCH' : 'WRONG_HADITH',
    missingGroups,
    forbiddenHit,
  };
}

// ===========================================================================
// 3. Chapter sanity
// ===========================================================================

export interface BookStat {
  name: string;
  rows: number;
  /** hadith_books.total_hadiths as stored. */
  declaredTotal: number | null;
  distinctChapters: number;
  largestChapterTitle: string | null;
  largestChapterRows: number;
  nullChapters: number;
}

/**
 * Books smaller than this are legitimately single-chapter (the three
 * forty-hadith collections), so the share rule does not apply to them.
 */
export const CHAPTER_RULE_MIN_ROWS = 200;

/** A single chapter holding more than this share of a large book is a defect. */
export const CHAPTER_MAX_SHARE = 0.35;

export interface StructureProblem {
  book: string;
  kind: 'CHAPTER_SKEW' | 'TOTAL_MISMATCH';
  detail: string;
}

/** Pure. Driven directly by the self-test. */
export function checkStructure(stats: BookStat[]): StructureProblem[] {
  const problems: StructureProblem[] = [];

  for (const s of stats) {
    if (s.rows >= CHAPTER_RULE_MIN_ROWS && s.rows > 0) {
      const share = s.largestChapterRows / s.rows;
      if (share > CHAPTER_MAX_SHARE) {
        problems.push({
          book: s.name,
          kind: 'CHAPTER_SKEW',
          detail:
            `"${s.largestChapterTitle}" holds ${s.largestChapterRows}/${s.rows} rows ` +
            `(${(share * 100).toFixed(1)}%, limit ${(CHAPTER_MAX_SHARE * 100).toFixed(0)}%) ` +
            `across only ${s.distinctChapters} distinct chapters — chapter mapping is collapsing sections`,
        });
      }
    }

    if (s.declaredTotal !== null && s.declaredTotal !== s.rows) {
      problems.push({
        book: s.name,
        kind: 'TOTAL_MISMATCH',
        detail: `total_hadiths=${s.declaredTotal} but ${s.rows} rows are stored (overstates by ${s.declaredTotal - s.rows})`,
      });
    }
  }

  return problems;
}

// ===========================================================================
// 4. Corpus access
// ===========================================================================

export interface LookupResult {
  found: boolean;
  via: 'canonical' | 'sequential' | 'none';
  textEnglish: string | null;
  collectionExists: boolean;
}

export interface HadithCorpus {
  describe(): string;
  bookStats(): Promise<BookStat[]>;
  lookup(collection: string, number: number): Promise<LookupResult>;
  /** Whether canonical numbering has been applied at all. */
  canonicalAvailable(): Promise<boolean>;
  close(): Promise<void>;
}

function scrub(message: string): string {
  const lines = (message ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !/^(?:→\s*)?\d+\s/.test(l))
    .filter((l) => !/^[\^|~│─]+$/.test(l))
    .filter((l) => !/^Invalid `/.test(l));

  return (lines.join(' ') || message || 'unknown error')
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, 'postgres://<redacted>')
    .replace(/password=[^\s&"']+/gi, 'password=<redacted>')
    .replace(/\s+/g, ' ')
    .trim();
}

class DbCorpus implements HadithCorpus {
  private pool: any;
  private schema: string | undefined;
  private hasCanonical: boolean | null = null;

  private constructor(pool: any, schema: string | undefined) {
    this.pool = pool;
    this.schema = schema;
  }

  static async connect(): Promise<DbCorpus> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not set. This script reads config exactly like the seed scripts (dotenv).',
      );
    }

    /* eslint-disable @typescript-eslint/no-var-requires */
    const { Pool } = require('pg');
    const {
      prismaSchemaOptions,
    } = require('../src/common/utils/db-schema');
    /* eslint-enable @typescript-eslint/no-var-requires */

    // `sslmode=require` makes node-postgres verify a self-signed RDS chain and
    // fail; every standalone script here strips it and sets ssl explicitly.
    const pool = new Pool({
      connectionString: databaseUrl.replace('sslmode=require', ''),
      ssl: { rejectUnauthorized: false },
    });

    // PrismaPg's `schema` option only qualifies what the query engine builds.
    // Raw SQL needs search_path, or every statement looks in `public`.
    const schema = prismaSchemaOptions(databaseUrl)?.schema;
    const corpus = new DbCorpus(pool, schema);
    await corpus.query('SELECT 1');
    return corpus;
  }

  private async query(sql: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      if (this.schema) {
        await client.query(`SET search_path TO "${this.schema}", public`);
      }
      return await client.query(sql, params);
    } finally {
      client.release();
    }
  }

  describe(): string {
    return `database${this.schema ? ` (schema ${this.schema})` : ''}`;
  }

  async canonicalAvailable(): Promise<boolean> {
    if (this.hasCanonical !== null) return this.hasCanonical;
    const r = await this.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hadiths' AND column_name = 'canonical_number'
          AND ($1::text IS NULL OR table_schema = $1::text) LIMIT 1`,
      [this.schema ?? null],
    );
    if (r.rowCount === 0) {
      this.hasCanonical = false;
      return false;
    }
    // The column can exist but be entirely unpopulated (migration applied,
    // backfill not run). That is not "available" for resolution purposes.
    const p = await this.query(
      'SELECT 1 FROM hadiths WHERE canonical_number IS NOT NULL LIMIT 1',
    );
    this.hasCanonical = (p.rowCount ?? 0) > 0;
    return this.hasCanonical;
  }

  async bookStats(): Promise<BookStat[]> {
    const books = await this.query(
      'SELECT id, name, total_hadiths FROM hadith_books ORDER BY sort_order ASC',
    );
    const out: BookStat[] = [];
    for (const b of books.rows) {
      const agg = await this.query(
        `SELECT chapter_title, COUNT(*)::int AS n
           FROM hadiths WHERE book_id = $1
          GROUP BY chapter_title ORDER BY n DESC`,
        [b.id],
      );
      const rows = agg.rows.reduce((s: number, r: any) => s + r.n, 0);
      const top = agg.rows[0];
      const nulls = agg.rows.find((r: any) => r.chapter_title === null);
      out.push({
        name: b.name,
        rows,
        declaredTotal: b.total_hadiths ?? null,
        distinctChapters: agg.rows.filter((r: any) => r.chapter_title !== null)
          .length,
        largestChapterTitle: top ? top.chapter_title : null,
        largestChapterRows: top ? top.n : 0,
        nullChapters: nulls ? nulls.n : 0,
      });
    }
    return out;
  }

  async lookup(collection: string, number: number): Promise<LookupResult> {
    const b = await this.query(
      'SELECT id FROM hadith_books WHERE name = $1',
      [collection],
    );
    if (b.rowCount === 0) {
      return {
        found: false,
        via: 'none',
        textEnglish: null,
        collectionExists: false,
      };
    }
    const bookId = b.rows[0].id;

    if (await this.canonicalAvailable()) {
      const r = await this.query(
        `SELECT text_english FROM hadiths
          WHERE book_id = $1 AND canonical_number = $2
          ORDER BY canonical_suffix ASC NULLS LAST, hadith_number ASC
          LIMIT 1`,
        [bookId, number],
      );
      if ((r.rowCount ?? 0) > 0) {
        return {
          found: true,
          via: 'canonical',
          textEnglish: r.rows[0].text_english,
          collectionExists: true,
        };
      }
    }

    const r = await this.query(
      'SELECT text_english FROM hadiths WHERE book_id = $1 AND hadith_number = $2 LIMIT 1',
      [bookId, number],
    );
    if ((r.rowCount ?? 0) > 0) {
      return {
        found: true,
        via: 'sequential',
        textEnglish: r.rows[0].text_english,
        collectionExists: true,
      };
    }
    return {
      found: false,
      via: 'none',
      textEnglish: null,
      collectionExists: true,
    };
  }

  async close(): Promise<void> {
    await this.pool.end().catch(() => {});
  }
}

// ===========================================================================
// 5. Running the gate
// ===========================================================================

export async function runFixtures(
  corpus: HadithCorpus,
  fixtures: HadithFixture[] = HADITH_FIXTURES,
): Promise<FixtureOutcome[]> {
  const out: FixtureOutcome[] = [];
  for (const f of fixtures) {
    const hit = await corpus.lookup(f.collection, f.number);
    if (!hit.collectionExists) {
      out.push({
        fixture: f,
        verdict: 'COLLECTION_ABSENT',
        via: 'none',
        missingGroups: [],
        forbiddenHit: [],
        sample: '',
      });
      continue;
    }
    if (!hit.found) {
      out.push({
        fixture: f,
        verdict: 'NOT_RESOLVED',
        via: 'none',
        missingGroups: [],
        forbiddenHit: [],
        sample: '',
      });
      continue;
    }
    const m = matchFixture(f, hit.textEnglish);
    out.push({
      fixture: f,
      verdict: m.verdict,
      via: hit.via,
      missingGroups: m.missingGroups,
      forbiddenHit: m.forbiddenHit,
      sample: (hit.textEnglish ?? '').slice(0, 110).replace(/\s+/g, ' '),
    });
  }
  return out;
}

const BAR = '─'.repeat(76);

function report(
  outcomes: FixtureOutcome[],
  problems: StructureProblem[],
  stats: BookStat[],
  corpusLabel: string,
  canonicalApplied: boolean,
): number {
  console.log(BAR);
  console.log(`Hadith content gate — corpus: ${corpusLabel}`);
  console.log(
    `citation resolution: ${canonicalApplied ? 'canonical_number (backfill applied)' : 'hadith_number ONLY — canonical numbering NOT applied'}`,
  );
  console.log(BAR);

  let failures = 0;
  for (const o of outcomes) {
    const bad = o.verdict !== 'MATCH';
    if (bad) failures++;
    const mark = bad ? 'FAIL' : 'PASS';
    console.log(
      `${mark}  ${o.fixture.collection} ${o.fixture.number} — ${o.fixture.subject}`,
    );
    if (bad || VERBOSE) {
      console.log(`      resolved via: ${o.via}`);
      if (o.sample) console.log(`      stored: "${o.sample}…"`);
      for (const g of o.missingGroups) {
        console.log(`      missing: none of [${g.join(' | ')}]`);
      }
      for (const f of o.forbiddenHit) {
        console.log(
          `      present but must not be: "${f}"  <-- this is the WRONG hadith`,
        );
      }
      if (o.verdict === 'NOT_RESOLVED') {
        console.log('      no row under this number');
      }
      if (o.verdict === 'COLLECTION_ABSENT') {
        console.log('      collection is not seeded');
      }
    }
  }

  console.log(BAR);
  if (stats.length > 0) {
    console.log('Structure:');
    for (const s of stats) {
      const share = s.rows > 0 ? (s.largestChapterRows / s.rows) * 100 : 0;
      console.log(
        `  ${s.name.padEnd(26)} rows=${String(s.rows).padStart(5)}  chapters=${String(s.distinctChapters).padStart(3)}  largest=${share.toFixed(1).padStart(5)}%`,
      );
    }
  }
  for (const p of problems) {
    console.log(`FAIL  [${p.kind}] ${p.book}: ${p.detail}`);
  }
  failures += problems.length;

  console.log(BAR);
  console.log(
    failures === 0
      ? `✅ ${outcomes.length} pinned citations verified by content; structure clean.`
      : `❌ ${failures} problem(s). ${outcomes.filter((o) => o.verdict === 'MATCH').length}/${outcomes.length} pinned citations matched.`,
  );
  return failures === 0 ? EXIT_OK : EXIT_FAILURES;
}

// ===========================================================================
// 6. Self-test — proves the matcher offline, with no database
// ===========================================================================

class FixtureCorpus implements HadithCorpus {
  constructor(
    private rows: Array<{
      collection: string;
      canonicalNumber: number | null;
      canonicalSuffix: number | null;
      hadithNumber: number;
      textEnglish: string;
    }>,
    private stats: BookStat[],
    private canonical: boolean,
  ) {}

  describe(): string {
    return 'in-memory fixtures (no database)';
  }
  async canonicalAvailable(): Promise<boolean> {
    return this.canonical;
  }
  async bookStats(): Promise<BookStat[]> {
    return this.stats;
  }
  async lookup(collection: string, number: number): Promise<LookupResult> {
    const inBook = this.rows.filter((r) => r.collection === collection);
    if (inBook.length === 0) {
      return {
        found: false,
        via: 'none',
        textEnglish: null,
        collectionExists: false,
      };
    }
    if (this.canonical) {
      const hits = inBook
        .filter((r) => r.canonicalNumber === number)
        .sort((a, b) => (a.canonicalSuffix ?? 1) - (b.canonicalSuffix ?? 1));
      if (hits.length > 0) {
        return {
          found: true,
          via: 'canonical',
          textEnglish: hits[0].textEnglish,
          collectionExists: true,
        };
      }
    }
    const seq = inBook.find((r) => r.hadithNumber === number);
    return seq
      ? {
          found: true,
          via: 'sequential',
          textEnglish: seq.textEnglish,
          collectionExists: true,
        }
      : {
          found: false,
          via: 'none',
          textEnglish: null,
          collectionExists: true,
        };
  }
  async close(): Promise<void> {}
}

interface Case {
  name: string;
  run: () => Promise<boolean> | boolean;
}

async function runSelfTest(): Promise<number> {
  const F = HADITH_FIXTURES.find(
    (f) => f.collection === 'Sahih Muslim' && f.number === 807,
  )!;

  const RIGHT_807 =
    'Abd al-Rahman b. Yazid reported: I met Abu Mas’ud near the House (Ka’ba) ' +
    'and said to him: A hadith has been conveyed to me on your authority about the two ' +
    '(concluding verses of Surah al-Baqara. He said: Yes. The Messenger of Allah (ﷺ) ' +
    'said: Anyone who recites the two verses at the end of Surah al-Baqara at night, they ' +
    'would suffice for him';

  const WRONG_807 =
    "Ibn 'Abbas said: The Messenger of Allah (ﷺ) saw a dead goat, which had been given " +
    'in charity to the freed slave-girl of Maimuna.';

  const cases: Case[] = [
    // --- the core capability: resolving is not the same as being right ----
    {
      name: 'a row that resolves but is the WRONG hadith fails',
      run: () => matchFixture(F, WRONG_807).verdict === 'WRONG_HADITH',
    },
    {
      name: 'the forbidden phrase is reported, naming the wrong hadith',
      run: () => matchFixture(F, WRONG_807).forbiddenHit.includes('dead goat'),
    },
    {
      name: 'the correct hadith matches',
      run: () => matchFixture(F, RIGHT_807).verdict === 'MATCH',
    },
    {
      name: 'empty stored text is NO_TEXT, not a silent pass',
      run: () => matchFixture(F, '').verdict === 'NO_TEXT',
    },
    {
      name: 'null stored text is NO_TEXT, not a silent pass',
      run: () => matchFixture(F, null).verdict === 'NO_TEXT',
    },
    {
      name: 'a plausible-but-unrelated hadith fails on missing groups',
      run: () => {
        const r = matchFixture(
          F,
          'The Prophet said: whoever recites Surah al-Baqara in his house, Satan does not enter it.',
        );
        return r.verdict === 'WRONG_HADITH' && r.missingGroups.length > 0;
      },
    },

    // --- folding: translation variance must not decide the outcome -------
    {
      name: 'honorific glyphs and punctuation are folded away',
      run: () =>
        foldEnglish('Messenger of Allah (ﷺ), said: "Al-Baqara!"') ===
        'messenger of allah said al baqara',
    },
    {
      name: 'curly apostrophes fold to the same text as straight ones',
      run: () => foldEnglish('Mu’adh') === foldEnglish("Mu'adh"),
    },
    {
      name: 'a different translator’s wording still matches',
      run: () =>
        matchFixture(
          F,
          'Whoever recites the last two verses of Surat Al-Baqarah at night, they shall be sufficient for him.',
        ).verdict === 'MATCH',
    },

    // --- resolution: canonical is preferred over sequential --------------
    {
      name: 'canonical numbering resolves to the right row',
      run: async () => {
        const c = new FixtureCorpus(
          [
            {
              collection: 'Sahih Muslim',
              canonicalNumber: 807,
              canonicalSuffix: 1,
              hadithNumber: 1878,
              textEnglish: RIGHT_807,
            },
            {
              collection: 'Sahih Muslim',
              canonicalNumber: 363,
              canonicalSuffix: 2,
              hadithNumber: 807,
              textEnglish: WRONG_807,
            },
          ],
          [],
          true,
        );
        const r = await runFixtures(c, [F]);
        return r[0].verdict === 'MATCH' && r[0].via === 'canonical';
      },
    },
    {
      name: 'WITHOUT canonical numbering the same corpus fails — the shipped defect',
      run: async () => {
        const c = new FixtureCorpus(
          [
            {
              collection: 'Sahih Muslim',
              canonicalNumber: null,
              canonicalSuffix: null,
              hadithNumber: 1878,
              textEnglish: RIGHT_807,
            },
            {
              collection: 'Sahih Muslim',
              canonicalNumber: null,
              canonicalSuffix: null,
              hadithNumber: 807,
              textEnglish: WRONG_807,
            },
          ],
          [],
          false,
        );
        const r = await runFixtures(c, [F]);
        return r[0].verdict === 'WRONG_HADITH' && r[0].via === 'sequential';
      },
    },
    {
      name: 'the lowest canonical_suffix wins (the primary narration)',
      run: async () => {
        const c = new FixtureCorpus(
          [
            {
              collection: 'Sahih Muslim',
              canonicalNumber: 807,
              canonicalSuffix: 2,
              hadithNumber: 1879,
              textEnglish: 'This hadith has been narrated by Mansur.',
            },
            {
              collection: 'Sahih Muslim',
              canonicalNumber: 807,
              canonicalSuffix: 1,
              hadithNumber: 1878,
              textEnglish: RIGHT_807,
            },
          ],
          [],
          true,
        );
        const r = await runFixtures(c, [F]);
        return r[0].verdict === 'MATCH';
      },
    },
    {
      name: 'a number with no row is NOT_RESOLVED',
      run: async () => {
        const c = new FixtureCorpus(
          [
            {
              collection: 'Sahih Muslim',
              canonicalNumber: 1,
              canonicalSuffix: 1,
              hadithNumber: 1,
              textEnglish: 'x',
            },
          ],
          [],
          true,
        );
        const r = await runFixtures(c, [F]);
        return r[0].verdict === 'NOT_RESOLVED';
      },
    },
    {
      name: 'an unseeded collection is COLLECTION_ABSENT, not a pass',
      run: async () => {
        const c = new FixtureCorpus([], [], true);
        const r = await runFixtures(c, [F]);
        return r[0].verdict === 'COLLECTION_ABSENT';
      },
    },

    // --- structure: the chapter-collapse smell test ----------------------
    {
      name: 'a chapter swallowing 76% of a large book is flagged',
      run: () => {
        const p = checkStructure([
          {
            name: 'Sahih Muslim',
            rows: 7563,
            declaredTotal: 7563,
            distinctChapters: 16,
            largestChapterTitle: 'The Book of Virtues',
            largestChapterRows: 5785,
            nullChapters: 0,
          },
        ]);
        return p.length === 1 && p[0].kind === 'CHAPTER_SKEW';
      },
    },
    {
      name: 'a healthy chapter distribution is not flagged',
      run: () =>
        checkStructure([
          {
            name: 'Sahih al-Bukhari',
            rows: 7563,
            declaredTotal: 7563,
            distinctChapters: 98,
            largestChapterTitle: 'Military Expeditions',
            largestChapterRows: 522,
            nullChapters: 6,
          },
        ]).length === 0,
      },
    {
      name: 'a 42-row single-chapter collection is exempt from the share rule',
      run: () =>
        checkStructure([
          {
            name: '40 Hadith Nawawi',
            rows: 42,
            declaredTotal: 42,
            distinctChapters: 1,
            largestChapterTitle: 'Forty Hadith of an-Nawawi',
            largestChapterRows: 42,
            nullChapters: 0,
          },
        ]).length === 0,
    },
    {
      name: 'total_hadiths overstating the stored rows is flagged',
      run: () => {
        const p = checkStructure([
          {
            name: 'Sahih al-Bukhari',
            rows: 7563,
            declaredTotal: 7589,
            distinctChapters: 98,
            largestChapterTitle: 'x',
            largestChapterRows: 500,
            nullChapters: 0,
          },
        ]);
        return p.length === 1 && p[0].kind === 'TOTAL_MISMATCH';
      },
    },

    // --- the fixture table itself ----------------------------------------
    {
      name: 'every fixture has at least two phrase groups (not trivially loose)',
      run: () => HADITH_FIXTURES.every((f) => f.mustContainAny.length >= 2),
    },
    {
      name: 'no two fixtures pin the same (collection, number)',
      run: () => {
        const keys = HADITH_FIXTURES.map(
          (f) => `${f.collection}#${f.number}`,
        );
        return new Set(keys).size === keys.length;
      },
    },
  ];

  console.log(BAR);
  console.log('Self-test — offline, no database');
  console.log(BAR);

  let failed = 0;
  for (const c of cases) {
    let ok = false;
    let err: string | null = null;
    try {
      ok = await c.run();
    } catch (e: any) {
      err = e?.message ?? String(e);
    }
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${c.name}${err ? ` (${err})` : ''}`);
  }

  console.log(BAR);
  console.log(
    failed === 0
      ? `✅ ${cases.length}/${cases.length} self-test cases passed.`
      : `❌ ${failed}/${cases.length} self-test cases failed.`,
  );
  return failed === 0 ? EXIT_OK : EXIT_FAILURES;
}

// ===========================================================================
// 7. Entry point
// ===========================================================================

/**
 * Run the gate. Exported so the feelings and collections verifiers can fold
 * it into their own runs — both of them prove that a cited number resolves,
 * and neither could prove it resolved to the right hadith until this existed.
 *
 * `selfTestOnly` lets those callers exercise the offline half under their own
 * `--self-test`, so their offline mode stays database-free.
 */
export async function runHadithContentGate(
  selfTestOnly = false,
): Promise<number> {
  return selfTestOnly ? runSelfTest() : main();
}

async function main(): Promise<number> {
  if (SELF_TEST) return runSelfTest();

  let corpus: HadithCorpus;
  try {
    corpus = await DbCorpus.connect();
  } catch (e: any) {
    console.error(`Could not read the corpus: ${scrub(e?.message ?? '')}`);
    console.error('Run with --self-test to prove the logic without a database.');
    return EXIT_INFRA;
  }

  try {
    const canonical = await corpus.canonicalAvailable();
    const outcomes = await runFixtures(corpus);
    const stats = await corpus.bookStats();
    const problems = checkStructure(stats);
    return report(outcomes, problems, stats, corpus.describe(), canonical);
  } catch (e: any) {
    console.error(`Failed: ${scrub(e?.message ?? '')}`);
    return EXIT_INFRA;
  } finally {
    await corpus.close();
  }
}

// Only run when invoked directly — the two citation verifiers import this
// module for its fixtures and gate, and importing must not execute a run.
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
