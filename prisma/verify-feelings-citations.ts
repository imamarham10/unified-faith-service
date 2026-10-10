/**
 * verify-feelings-citations.ts
 * ---------------------------------------------------------------------------
 * Citation gate for the Islam "feelings" content set.
 *
 * Every remedy in prisma/seed-feelings.ts carries a free-text `source` string
 * ("Quran 2:153", "Sahih al-Bukhari 6363") that has no foreign key to the
 * seeded corpora. This script turns that string into a real lookup:
 *
 *   1. parse   — "Quran 2:153" -> (surah 2, verse 153); "Tirmidhi 3524" ->
 *                (book "Jami at-Tirmidhi", hadith 3524). Anything that does not
 *                parse, or that names two sources at once, is a FAILURE.
 *   2. canon   — collection aliases (Abu Daud / Abu Dawud / Sunan Abi Dawud)
 *                are folded onto the canonical HadithBook.name values, which
 *                are read out of prisma/seed-hadiths.ts rather than guessed.
 *   3. resolve — the citation is looked up in quran_verses / hadiths. No row
 *                means the number is wrong or invented: FAILURE.
 *   4. compare — the remedy's stored Arabic is compared against the corpus
 *                Arabic after diacritic/orthography normalisation. A remedy
 *                that is only a *clause* of the cited ayah is reported as
 *                EXCERPT, never as a silent pass — that is precisely the
 *                "At-Talaq 65:2" bug that shipped once already.
 *   5. bound   — a citation into a collection that is not seeded cannot be
 *                verified at all, and is reported as UNVERIFIABLE rather than
 *                being counted as a pass.
 *
 * READ-ONLY. It never writes, never migrates, and never touches .env beyond
 * the `import 'dotenv/config'` that every other seed script already does.
 * DATABASE_URL is never printed, including in error paths.
 *
 * Usage:
 *   npm run prisma:verify:feelings              # verify against the database
 *   npm run prisma:verify:feelings -- --self-test   # offline logic proof
 *   npm run prisma:verify:feelings -- --strict      # warnings also fail CI
 *
 * Exit codes: 0 = clean, 1 = citation failures (or --strict warnings, or a
 * failing self-test), 2 = could not reach / read the database.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

// ===========================================================================
// 0. CLI
// ===========================================================================

const ARGV = process.argv.slice(2);
const SELF_TEST = ARGV.includes('--self-test');
const STRICT = ARGV.includes('--strict');
const VERBOSE = ARGV.includes('--verbose');

const EXIT_OK = 0;
const EXIT_FAILURES = 1;
const EXIT_INFRA = 2;

// ===========================================================================
// 1. Source-file extraction (no imports — importing a seed script runs it)
// ===========================================================================

const PRISMA_DIR = __dirname;
const FEELINGS_SEED = path.join(PRISMA_DIR, 'seed-feelings.ts');
const HADITH_SEED = path.join(PRISMA_DIR, 'seed-hadiths.ts');

/**
 * Slice a top-level array literal out of a TS source file by bracket matching.
 *
 * seed-feelings.ts has no exports, builds a PrismaClient at module scope and
 * calls main() on load, so `import`ing it would execute the seed (a write).
 * The literal is pure data, so lifting the text out and evaluating just that
 * is both safe and side-effect free.
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

    // skip comments
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

    // skip strings (single, double, template) with escape handling
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

function evalLiteral<T>(literal: string, what: string): T {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    return new Function(`"use strict"; return (${literal});`)() as T;
  } catch (err: any) {
    throw new Error(`could not evaluate ${what}: ${err.message}`);
  }
}

interface SeedRemedy {
  arabicText: string;
  transliteration?: string;
  translation: string;
  source: string;
}
interface SeedEmotion {
  name: string;
  slug: string;
  icon?: string;
  remedies: SeedRemedy[];
}

function loadSeedEmotions(): SeedEmotion[] {
  const src = fs.readFileSync(FEELINGS_SEED, 'utf8');
  const literal = extractArrayLiteral(src, 'emotionsData');
  return evalLiteral<SeedEmotion[]>(literal, 'emotionsData from seed-feelings.ts');
}

/** Canonical HadithBook.name values, read from seed-hadiths.ts BOOK_CONFIGS. */
function loadCanonicalBookNames(): string[] {
  const src = fs.readFileSync(HADITH_SEED, 'utf8');
  const literal = extractArrayLiteral(src, 'BOOK_CONFIGS');
  const names: string[] = [];
  const re = /^\s*name:\s*"((?:[^"\\]|\\.)*)"/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(literal)) !== null) names.push(m[1]);
  if (names.length === 0) {
    throw new Error('BOOK_CONFIGS in seed-hadiths.ts yielded no book names');
  }
  return names;
}

// ===========================================================================
// 2. Collection-name canonicalisation
// ===========================================================================

/** Fold a collection name for matching: lowercase, letters+digits only. */
function foldName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’ʻʼ`']/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Alias -> canonical. The canonical spelling is whatever seed-hadiths.ts
 * seeds; note that for Abu Dawud the canonical is "Sunan Abu Dawud", which is
 * a *fourth* spelling — none of the three in seed-feelings.ts match it.
 */
const ALIAS_SOURCE: Record<string, string[]> = {
  'Sahih al-Bukhari': [
    'bukhari', 'albukhari', 'sahihbukhari', 'sahihalbukhari', 'sahihulbukhari',
    'bukhaari', 'saheehbukhari', 'saheehalbukhari',
  ],
  'Sahih Muslim': ['muslim', 'sahihmuslim', 'saheehmuslim'],
  'Sunan Abu Dawud': [
    'abudaud', 'abudawud', 'abudawood', 'abidawud', 'abidaud',
    'sunanabidawud', 'sunanabidaud', 'sunanabudawud', 'sunanabudaud',
    'sunanabiedawud', 'sunanabudawood', 'abudawuud',
  ],
  'Jami at-Tirmidhi': [
    'tirmidhi', 'attirmidhi', 'altirmidhi', 'tirmizi', 'tirmidzi',
    'jamiattirmidhi', 'jamitirmidhi', 'sunanattirmidhi', 'sunantirmidhi',
    'jamialtirmidhi',
  ],
  "Sunan an-Nasa'i": [
    'nasai', 'annasai', 'alnasai', 'sunannasai', 'sunanannasai',
    'nasaai', 'sunanalnasai',
  ],
  'Sunan Ibn Majah': [
    'ibnmajah', 'sunanibnmajah', 'ibnmaja', 'ibnimajah', 'sunanibnimajah',
  ],
  'Muwatta Imam Malik': [
    'malik', 'muwatta', 'muwattamalik', 'muwattaimammalik', 'almuwatta',
    'muwattaamalik', 'muwattamaalik',
  ],
  '40 Hadith Nawawi': [
    'nawawi', 'imamnawawi', '40hadithnawawi', 'fortyhadithnawawi',
    'arbaeennawawi', 'annawawi40hadith', '40hadithalnawawi',
  ],
  '40 Hadith Qudsi': [
    'qudsi', 'hadithqudsi', '40hadithqudsi', 'fortyhadithqudsi',
    'ahadithqudsi',
  ],
  '40 Hadith Shah Waliullah': [
    'dehlawi', 'shahwaliullah', '40hadithshahwaliullah',
    'fortyhadithshahwaliullah', 'shahwaliyullah',
  ],
};

class BookResolver {
  readonly canonical: string[];
  private map = new Map<string, string>();
  readonly aliasWarnings: string[] = [];

  constructor(canonical: string[]) {
    this.canonical = canonical;
    const canonSet = new Set(canonical);

    // every canonical name matches itself
    for (const name of canonical) this.map.set(foldName(name), name);

    for (const [target, aliases] of Object.entries(ALIAS_SOURCE)) {
      if (!canonSet.has(target)) {
        // seed-hadiths.ts changed under us — say so loudly instead of
        // silently mapping citations onto a book that is never seeded.
        this.aliasWarnings.push(
          `alias table targets "${target}", which is no longer configured in seed-hadiths.ts`,
        );
        continue;
      }
      for (const alias of aliases) this.map.set(foldName(alias), target);
    }
  }

  resolve(raw: string): string | null {
    return this.map.get(foldName(raw)) ?? null;
  }
}

// ===========================================================================
// 3. Arabic normalisation
// ===========================================================================

// tashkeel / harakat, dagger alef, Quranic waqf + recitation marks, tatweel
const DIACRITICS =
  /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿﹰ-ﹿـ]/g;

/**
 * Collapse an Arabic string to a comparable skeleton:
 *  - strip all diacritics / waqf marks / tatweel
 *  - fold alef, ya, waw, hamza and ta-marbuta variants
 *  - drop every non-Arabic-letter character (Latin digits, "(33)", "۔",
 *    "،", brackets) so punctuation can never cause a false mismatch
 */
function normaliseArabic(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFC')
    .replace(DIACRITICS, '')
    .replace(/[آأإٱٲٳ]/g, 'ا') // A/I/madda/wasla -> alef
    .replace(/[ىيی]/g, 'ي')                   // alef maqsura -> ya
    .replace(/[ؤۆ]/g, 'و')                         // waw hamza -> waw
    .replace(/[ئ]/g, 'ي')                               // ya hamza  -> ya
    .replace(/[ة]/g, 'ه')                               // ta marbuta -> ha
    .replace(/[ء]/g, '')                                     // standalone hamza
    .replace(/[^ء-ي\s]/g, ' ')                          // everything else
    .replace(/\s+/g, ' ')
    .trim();
}

/** Space-free skeleton — used for equality and substring tests. */
function skeleton(input: string): string {
  return normaliseArabic(input).replace(/\s+/g, '');
}

/**
 * Second-tier skeleton with the long-vowel letters (alef, waw, ya) dropped.
 *
 * The seeded Quran corpus is Uthmani script; hand-entered remedies are written
 * in modern imla'i spelling. The two differ *only* in how long vowels are
 * written — ٱلصَّلَوٰةِ vs ٱلصَّلَاةِ, يَٰٓأَيُّهَا vs يَا أَيُّهَا, أَشۡكُواْ vs أَشْكُو.
 * Comparing with those letters removed separates "same passage, different
 * orthography" from a genuinely different passage, which otherwise produces a
 * wall of false MISMATCHes that would make this gate unusable.
 */
function looseSkeleton(input: string): string {
  return skeleton(input).replace(/[\u0627\u0648\u064A]/g, '');
}

/** Dice coefficient over character trigrams; a diagnostic, not a gate. */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const grams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < Math.max(s.length - 2, 1); i++) {
      const g = s.slice(i, i + 3);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };
  const ga = grams(a);
  const gb = grams(b);
  let overlap = 0;
  let total = 0;
  for (const n of ga.values()) total += n;
  for (const n of gb.values()) total += n;
  for (const [g, n] of ga) overlap += Math.min(n, gb.get(g) ?? 0);
  return (2 * overlap) / total;
}

// ===========================================================================
// 4. Citation parsing
// ===========================================================================

type Citation =
  | {
      kind: 'quran';
      surah: number;
      from: number;
      to: number;
      surahLabel: string | null;
      raw: string;
    }
  | {
      kind: 'hadith';
      collectionRaw: string;
      canonical: string | null;
      from: number;
      to: number;
      numberSuffix: string | null;
      raw: string;
    };

/**
 * Deliberately a single shape rather than a discriminated union: this repo
 * compiles with `strictNullChecks: false`, under which TS will not narrow a
 * `{ok:true}|{ok:false}` union.
 */
interface ParseResult {
  ok: boolean;
  citation?: Citation;
  reason?: string;
}

const QURAN_KEYWORDS = new Set([
  'quran', 'quraan', 'alquran', 'holyquran', 'thequran', 'quraankareem',
  'surah', 'surat', 'sura', 'soorah', 'qurankareem', 'alquranalkareem',
]);

/** Splitters that mean "this field names more than one source". */
const COMPOUND_SPLIT = /\s*(?:\/|;|&|\||\+|\band\b|،)\s*/i;

function parseCitation(rawInput: string, books: BookResolver): ParseResult {
  const raw = (rawInput ?? '').trim();
  if (!raw) return { ok: false, reason: 'source is empty' };

  // --- compound sources ---------------------------------------------------
  // "Quran 16:98 / Abu Daud 4781" names a Quranic ayah AND a hadith in one
  // field. There is no single row it can resolve to, and neither half can be
  // attributed to the rendered text, so it is a failure by construction.
  const parts = raw.split(COMPOUND_SPLIT).filter((p) => p.trim().length > 0);
  if (parts.length > 1) {
    return {
      ok: false,
      reason: `names ${parts.length} sources in one field (${parts
        .map((p) => `"${p.trim()}"`)
        .join(' + ')}) — split into separate remedies`,
    };
  }

  // --- Quran: <label?> S:V or S:V-V2 --------------------------------------
  const quranMatch =
    /^(.*?)(\d{1,3})\s*[:.٫]\s*(\d{1,3})(?:\s*[-–—to]+\s*(\d{1,3}))?\s*$/i.exec(
      raw,
    );
  if (quranMatch) {
    const labelRaw = quranMatch[1].trim().replace(/[,:]$/, '').trim();
    const surah = parseInt(quranMatch[2], 10);
    const from = parseInt(quranMatch[3], 10);
    const to = quranMatch[4] ? parseInt(quranMatch[4], 10) : from;

    // A hadith collection with a colon-style reference ("Bukhari 1:2") is a
    // volume/book reference, which this schema cannot resolve.
    if (labelRaw && books.resolve(labelRaw)) {
      return {
        ok: false,
        reason: `"${labelRaw}" is a hadith collection but the reference is verse-style ("${quranMatch[2]}:${quranMatch[3]}") — hadiths are cited by a single hadith number`,
      };
    }

    // strip the Quran keyword; whatever remains is a surah name claim
    const folded = foldName(labelRaw);
    let surahLabel: string | null = null;
    if (folded && !QURAN_KEYWORDS.has(folded)) {
      let rest = labelRaw;
      for (const kw of ['quran', "qur'an", 'qurʾan', 'holy quran', 'the quran', 'surah', 'surat', 'sura']) {
        rest = rest.replace(new RegExp(`\\b${kw}\\b`, 'ig'), ' ');
      }
      rest = rest.replace(/[^\p{L}\s'’-]/gu, ' ').replace(/\s+/g, ' ').trim();
      surahLabel = rest.length > 1 ? rest : null;
    }

    if (surah < 1 || surah > 114) {
      return { ok: false, reason: `surah ${surah} is outside the Quran (1-114)` };
    }
    if (from < 1 || to < 1) {
      return { ok: false, reason: 'verse numbers must be 1 or greater' };
    }
    if (to < from) {
      return { ok: false, reason: `verse range ${from}-${to} runs backwards` };
    }
    if (to - from > 50) {
      return { ok: false, reason: `verse range ${from}-${to} is implausibly long` };
    }
    return {
      ok: true,
      citation: { kind: 'quran', surah, from, to, surahLabel, raw },
    };
  }

  // --- Hadith: <collection> <number>[a] or <collection> <n>-<m> -----------
  const hadithMatch =
    /^(.*?[^\s\d])\s*(?:,)?\s*(?:no\.?|#|hadith)?\s*(\d{1,6})([a-z])?(?:\s*[-–]\s*(\d{1,6}))?\s*$/i.exec(
      raw,
    );
  if (hadithMatch) {
    const collectionRaw = hadithMatch[1].trim().replace(/[,:]$/, '').trim();
    const from = parseInt(hadithMatch[2], 10);
    const to = hadithMatch[4] ? parseInt(hadithMatch[4], 10) : from;
    const suffix = hadithMatch[3] ?? null;

    if (!collectionRaw) {
      return { ok: false, reason: 'a bare number with no collection name' };
    }
    if (to < from) {
      return { ok: false, reason: `hadith range ${from}-${to} runs backwards` };
    }
    return {
      ok: true,
      citation: {
        kind: 'hadith',
        collectionRaw,
        canonical: books.resolve(collectionRaw),
        from,
        to,
        numberSuffix: suffix,
        raw,
      },
    };
  }

  return {
    ok: false,
    reason:
      'not a recognised citation — expected "Quran <surah>:<verse>[-<verse>]" or "<Collection> <number>"',
  };
}

// ===========================================================================
// 5. Corpus access (DB-backed, or fixtures for the self-test)
// ===========================================================================

interface SurahInfo {
  seededVerses: number;
  declaredVerseCount: number | null;
  names: string[];
}

interface BookInfo {
  seededHadiths: number;
  /** HadithBook.totalHadiths — what the collection *should* contain. */
  totalHadiths: number | null;
}

interface Corpus {
  describe(): string;
  surahInfo(surahId: number): Promise<SurahInfo | null>;
  quranVerses(surahId: number, numbers: number[]): Promise<Map<number, string>>;
  bookInfo(canonicalName: string): Promise<BookInfo | null>;
  hadiths(canonicalName: string, numbers: number[]): Promise<Map<number, string>>;
  close(): Promise<void>;
}

/**
 * Reduce an error to one readable sentence.
 *
 * Prisma 7 prefixes connection errors with a source code frame
 * ("  544 const prisma = ...", "\u2192 547 await ..."), which is exactly the
 * stack-trace noise this script is supposed to avoid. Strip the frame, keep
 * the human sentence, and scrub anything credential-shaped — DATABASE_URL
 * must never reach stdout or stderr.
 */
function scrub(message: string): string {
  const lines = (message ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    // code-frame gutter lines: "544 const ...", "\u2192 547 await ..."
    .filter((l) => !/^(?:\u2192\s*)?\d+\s/.test(l))
    .filter((l) => !/^[\^|~\u2502\u2500]+$/.test(l))
    .filter((l) => !/^Invalid `/.test(l))
    .filter((l) => !/^\d+$/.test(l))
    // bare "<file>:<line>:<col>" continuation lines
    .filter((l) => !/^\/?\S+\.(?:ts|js):\d+:\d+$/.test(l));

  return (lines.join(' ') || message || 'unknown error')
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, 'postgres://<redacted>')
    .replace(/password=[^\s&"']+/gi, 'password=<redacted>')
    .replace(/\s+/g, ' ')
    .trim();
}

interface BookCacheEntry {
  id: string;
  seededHadiths: number;
  totalHadiths: number | null;
}

class DbCorpus implements Corpus {
  private prisma: any;
  private pool: any;
  private surahCache = new Map<number, SurahInfo | null>();
  private bookCache = new Map<string, BookCacheEntry | null>();

  private constructor(prisma: any, pool: any) {
    this.prisma = prisma;
    this.pool = pool;
  }

  static async connect(): Promise<DbCorpus> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not set. This script reads config exactly like the seed scripts (dotenv); populate the environment and retry.',
      );
    }

    // Same adapter wiring as prisma/seed-hadiths.ts and PrismaService.
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { PrismaClient } = require('@prisma/client');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const { Pool } = require('pg');
    const { prismaSchemaOptions } = require('../src/common/utils/db-schema');
    /* eslint-enable @typescript-eslint/no-var-requires */

    const pool = new Pool({
      connectionString: databaseUrl.replace('sslmode=require', ''),
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
    const adapter = new PrismaPg(pool, prismaSchemaOptions());
    const prisma = new PrismaClient({ adapter });

    // Fail fast, and read-only: a trivial count rather than $connect alone.
    await prisma.quranSurah.count();
    return new DbCorpus(prisma, pool);
  }

  describe(): string {
    return 'live database (quran_verses, hadith_books, hadiths)';
  }

  async surahInfo(surahId: number): Promise<SurahInfo | null> {
    if (this.surahCache.has(surahId)) return this.surahCache.get(surahId)!;
    const surah = await this.prisma.quranSurah.findUnique({
      where: { id: surahId },
    });
    const seededVerses = await this.prisma.quranVerse.count({
      where: { surahId },
    });
    const info: SurahInfo | null =
      !surah && seededVerses === 0
        ? null
        : {
            seededVerses,
            declaredVerseCount: surah?.verseCount ?? null,
            names: surah
              ? [surah.nameEnglish, surah.nameTransliteration].filter(Boolean)
              : [],
          };
    this.surahCache.set(surahId, info);
    return info;
  }

  async quranVerses(
    surahId: number,
    numbers: number[],
  ): Promise<Map<number, string>> {
    const rows = await this.prisma.quranVerse.findMany({
      where: { surahId, verseNumber: { in: numbers } },
      select: { verseNumber: true, textArabic: true, textSimple: true },
    });
    const out = new Map<number, string>();
    for (const r of rows) {
      out.set(r.verseNumber, r.textSimple || r.textArabic || '');
    }
    return out;
  }

  private async book(canonicalName: string) {
    if (this.bookCache.has(canonicalName)) {
      return this.bookCache.get(canonicalName)!;
    }
    const row = await this.prisma.hadithBook.findUnique({
      where: { name: canonicalName },
      select: { id: true, totalHadiths: true },
    });
    let value: BookCacheEntry | null = null;
    if (row) {
      const seededHadiths = await this.prisma.hadith.count({
        where: { bookId: row.id },
      });
      value = {
        id: row.id,
        seededHadiths,
        totalHadiths: row.totalHadiths ?? null,
      };
    }
    this.bookCache.set(canonicalName, value);
    return value;
  }

  async bookInfo(canonicalName: string): Promise<BookInfo | null> {
    const b = await this.book(canonicalName);
    return b
      ? { seededHadiths: b.seededHadiths, totalHadiths: b.totalHadiths }
      : null;
  }

  async hadiths(
    canonicalName: string,
    numbers: number[],
  ): Promise<Map<number, string>> {
    const b = await this.book(canonicalName);
    const out = new Map<number, string>();
    if (!b) return out;
    const rows = await this.prisma.hadith.findMany({
      where: { bookId: b.id, hadithNumber: { in: numbers } },
      select: { hadithNumber: true, textArabic: true },
    });
    for (const r of rows) out.set(r.hadithNumber, r.textArabic || '');
    return out;
  }

  async close(): Promise<void> {
    try {
      await this.prisma.$disconnect();
    } catch {
      /* ignore */
    }
    try {
      await this.pool.end();
    } catch {
      /* ignore */
    }
  }
}

// ===========================================================================
// 6. Verification
// ===========================================================================

type Status = 'PASS' | 'FAIL' | 'UNVERIFIABLE';
type TextVerdict =
  | 'EXACT'
  /** same passage, but Uthmani vs imla'i long-vowel spelling. Not a warning. */
  | 'EXACT_ORTHOGRAPHY'
  | 'EXCERPT'
  | 'SUPERSET'
  | 'MISMATCH'
  | 'NO_CORPUS_TEXT'
  | 'NO_REMEDY_TEXT'
  | 'NOT_COMPARED';

interface Result {
  emotionSlug: string;
  source: string;
  status: Status;
  /** FAIL / UNVERIFIABLE explanation. */
  detail: string;
  textVerdict: TextVerdict;
  textDetail: string;
  canonicalised: string | null;
}

function isWarning(r: Result): boolean {
  return (
    r.status === 'PASS' &&
    r.textVerdict !== 'EXACT' &&
    r.textVerdict !== 'EXACT_ORTHOGRAPHY' &&
    r.textVerdict !== 'NOT_COMPARED'
  );
}

function compareText(remedyArabic: string, corpusArabic: string): {
  verdict: TextVerdict;
  detail: string;
} {
  const a = skeleton(remedyArabic);
  const b = skeleton(corpusArabic);

  if (!a) return { verdict: 'NO_REMEDY_TEXT', detail: 'remedy has no Arabic text' };
  if (!b) {
    return {
      verdict: 'NO_CORPUS_TEXT',
      detail: 'corpus row has no Arabic text to compare against',
    };
  }
  const excerptDetail = (note: string) => {
    const pct = Math.round((a.length / b.length) * 100);
    return `remedy text is only ${pct}% of the cited passage — a partial clause, not the whole of it${note}`;
  };
  const SUPERSET_DETAIL =
    'remedy text contains the cited passage plus extra material not covered by this citation';

  // Tier 1: exact orthography.
  if (a === b) return { verdict: 'EXACT', detail: '' };
  if (b.includes(a)) return { verdict: 'EXCERPT', detail: excerptDetail('') };
  if (a.includes(b)) return { verdict: 'SUPERSET', detail: SUPERSET_DETAIL };

  // Tier 2: ignore long-vowel spelling (Uthmani corpus vs imla'i remedy).
  // Guarded by a minimum length so short strings cannot collide by accident.
  const ORTHOGRAPHY_MIN = 8;
  const la = looseSkeleton(remedyArabic);
  const lb = looseSkeleton(corpusArabic);
  const ORTHO_NOTE =
    " (matched after relaxing Uthmani/imla'i long-vowel spelling)";
  if (la.length >= ORTHOGRAPHY_MIN && lb.length >= ORTHOGRAPHY_MIN) {
    if (la === lb) {
      return {
        verdict: 'EXACT_ORTHOGRAPHY',
        detail: `matches the cited passage;${ORTHO_NOTE.trim().replace(/^\(|\)$/g, '')}`,
      };
    }
    if (lb.includes(la)) {
      return { verdict: 'EXCERPT', detail: excerptDetail(ORTHO_NOTE) };
    }
    if (la.includes(lb)) {
      return { verdict: 'SUPERSET', detail: SUPERSET_DETAIL + ORTHO_NOTE };
    }
  }

  const pct = Math.round(similarity(a, b) * 100);
  return {
    verdict: 'MISMATCH',
    detail: `remedy text does not match the cited passage (${pct}% similar)`,
  };
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let n = from; n <= to; n++) out.push(n);
  return out;
}

async function verifyRemedy(
  emotionSlug: string,
  remedy: SeedRemedy,
  books: BookResolver,
  corpus: Corpus,
): Promise<Result> {
  const base = {
    emotionSlug,
    source: remedy.source,
    canonicalised: null as string | null,
    textVerdict: 'NOT_COMPARED' as TextVerdict,
    textDetail: '',
  };

  const parsed = parseCitation(remedy.source, books);
  if (!parsed.ok) {
    return { ...base, status: 'FAIL', detail: `unparseable — ${parsed.reason}` };
  }
  const c = parsed.citation as Citation;

  // ---- Quran --------------------------------------------------------------
  if (c.kind === 'quran') {
    const label = `Quran ${c.surah}:${c.from}${c.to !== c.from ? `-${c.to}` : ''}`;
    const info = await corpus.surahInfo(c.surah);

    if (!info || info.seededVerses === 0) {
      return {
        ...base,
        canonicalised: label,
        status: 'UNVERIFIABLE',
        detail: `surah ${c.surah} is not seeded in quran_verses — citation cannot be checked`,
      };
    }

    const wanted = range(c.from, c.to);
    const found = await corpus.quranVerses(c.surah, wanted);
    const missing = wanted.filter((n) => !found.has(n));
    if (missing.length > 0) {
      const declared = info.declaredVerseCount;
      const highest = Math.max(...missing);

      // A verse number past the end of the surah is a real fabrication.
      // A missing row in a surah that is only *partially* seeded is a gap in
      // the corpus, and calling that a fabricated citation would block CI on
      // a non-bug. Only the first is a FAILURE.
      const partiallySeeded =
        declared != null && info.seededVerses < declared && highest <= declared;

      if (partiallySeeded) {
        return {
          ...base,
          canonicalised: label,
          status: 'UNVERIFIABLE',
          detail: `surah ${c.surah} is only partially seeded (${info.seededVerses}/${declared} ayat), so verse ${missing.join(
            ', ',
          )} cannot be distinguished from a corpus gap — reseed the Quran before trusting this`,
        };
      }

      const bound =
        declared != null ? ` (surah ${c.surah} has ${declared} ayat)` : '';
      return {
        ...base,
        canonicalised: label,
        status: 'FAIL',
        detail: `no such verse${missing.length > 1 ? 's' : ''}: ${c.surah}:${missing.join(
          ', ',
        )}${bound}`,
      };
    }

    let surahNameNote = '';
    if (c.surahLabel && info.names.length > 0) {
      const claim = foldName(c.surahLabel);
      const matches = info.names.some(
        (n) => foldName(n).includes(claim) || claim.includes(foldName(n)),
      );
      if (!matches) {
        surahNameNote = ` [surah name "${c.surahLabel}" does not match surah ${c.surah} (${info.names.join(
          '/',
        )})]`;
      }
    }

    const corpusText = wanted.map((n) => found.get(n) ?? '').join(' ');
    const cmp = compareText(remedy.arabicText, corpusText);
    return {
      ...base,
      canonicalised: label,
      status: 'PASS',
      detail: '',
      textVerdict: surahNameNote && cmp.verdict === 'EXACT' ? 'MISMATCH' : cmp.verdict,
      textDetail: (cmp.detail + surahNameNote).trim(),
    };
  }

  // ---- Hadith -------------------------------------------------------------
  if (!c.canonical) {
    return {
      ...base,
      status: 'UNVERIFIABLE',
      detail: `collection "${c.collectionRaw}" is not one of the ${books.canonical.length} seeded books and has no alias — either it is a genuine outside collection, or the name is misspelled`,
    };
  }

  const label = `${c.canonical} ${c.from}${c.to !== c.from ? `-${c.to}` : ''}`;
  const info = await corpus.bookInfo(c.canonical);
  if (!info || info.seededHadiths === 0) {
    return {
      ...base,
      canonicalised: label,
      status: 'UNVERIFIABLE',
      detail: `"${c.canonical}" is configured but has no rows in hadiths — run prisma:seed:hadiths before trusting this citation`,
    };
  }

  const wanted = range(c.from, c.to);
  const found = await corpus.hadiths(c.canonical, wanted);
  const missing = wanted.filter((n) => !found.has(n));
  if (missing.length > 0) {
    const declared = info.totalHadiths;
    const highest = Math.max(...missing);

    // Several seeded books are short of their declared totalHadiths (the CDN
    // editions skip numbers), so a missing row inside the declared range is
    // ambiguous between a fabricated number and a corpus gap. Report it as
    // UNVERIFIABLE rather than failing the build on a seeding artefact.
    const partiallySeeded =
      declared != null && info.seededHadiths < declared && highest <= declared;

    if (partiallySeeded) {
      return {
        ...base,
        canonicalised: label,
        status: 'UNVERIFIABLE',
        detail: `"${c.canonical}" is only partially seeded (${info.seededHadiths}/${declared}), so hadith ${missing.join(
          ', ',
        )} cannot be distinguished from a corpus gap — confirm this number by hand`,
      };
    }

    return {
      ...base,
      canonicalised: label,
      status: 'FAIL',
      detail: `no hadith number ${missing.join(', ')} in "${c.canonical}" (${info.seededHadiths} seeded${
        declared != null ? `, ${declared} expected` : ''
      })`,
    };
  }

  const suffixNote = c.numberSuffix
    ? ` [citation suffix "${c.numberSuffix}" ignored — the corpus stores plain integers]`
    : '';
  const corpusText = wanted.map((n) => found.get(n) ?? '').join(' ');
  const cmp = compareText(remedy.arabicText, corpusText);
  return {
    ...base,
    canonicalised: label,
    status: 'PASS',
    detail: '',
    textVerdict: cmp.verdict,
    textDetail: (cmp.detail + suffixNote).trim(),
  };
}

// ===========================================================================
// 7. Reporting
// ===========================================================================

const BAR = '─'.repeat(74);

function line(r: Result, note?: string): string {
  const slug = r.emotionSlug.padEnd(14);
  const src = `"${r.source}"`.padEnd(34);
  return `  ${slug} ${src} ${note ?? r.detail}`;
}

function report(results: Result[], aliasWarnings: string[], corpusLabel: string): number {
  const failures = results.filter((r) => r.status === 'FAIL');
  const unverifiable = results.filter((r) => r.status === 'UNVERIFIABLE');
  const warnings = results.filter(isWarning);
  const clean = results.filter((r) => r.status === 'PASS' && !isWarning(r));

  console.log('');
  console.log(BAR);
  console.log('  Feelings citation verification');
  console.log(`  corpus: ${corpusLabel}`);
  console.log(BAR);

  if (aliasWarnings.length > 0) {
    console.log('\n  CONFIG');
    for (const w of aliasWarnings) console.log(`    ! ${w}`);
  }

  if (failures.length > 0) {
    console.log(`\nFAILED (${failures.length}) — these must be fixed before shipping`);
    for (const r of failures) console.log(line(r));
  }

  if (unverifiable.length > 0) {
    console.log(
      `\nUNVERIFIABLE (${unverifiable.length}) — outside the seeded corpora; NOT a pass`,
    );
    for (const r of unverifiable) console.log(line(r));
  }

  if (warnings.length > 0) {
    console.log(`\nWARNINGS (${warnings.length}) — citation resolves, text diverges`);
    for (const r of warnings) {
      console.log(line(r, `${r.textVerdict}: ${r.textDetail}`));
    }
  }

  if (VERBOSE && clean.length > 0) {
    console.log(`\nPASSED (${clean.length})`);
    for (const r of clean) console.log(line(r, `-> ${r.canonicalised}`));
  }

  console.log('');
  console.log(BAR);
  const ortho = clean.filter((r) => r.textVerdict === 'EXACT_ORTHOGRAPHY').length;
  console.log(
    `  passed ${clean.length}   failed ${failures.length}   unverifiable ${unverifiable.length}   warnings ${warnings.length}   (${results.length} citations)`,
  );
  if (ortho > 0) {
    console.log(
      `  (${ortho} of the passes matched only after relaxing Uthmani/imla'i long-vowel spelling)`,
    );
  }
  console.log(BAR);
  console.log(
    '  note: hadith numbers are checked against the fawazahmed0 edition numbering\n' +
      '        that prisma/seed-hadiths.ts imports. A hadith that does not resolve is\n' +
      '        either fabricated or cited from a different numbering scheme.',
  );
  console.log('');

  if (failures.length > 0) return EXIT_FAILURES;
  if (STRICT && (warnings.length > 0 || unverifiable.length > 0)) {
    console.log('  --strict: warnings and unverifiable citations are treated as failures.\n');
    return EXIT_FAILURES;
  }
  return EXIT_OK;
}

// ===========================================================================
// 8. Self-test (no database)
// ===========================================================================

/** Minimal in-memory corpus so parsing/normalisation/classification are
 *  provable without a live connection. */
class FixtureCorpus implements Corpus {
  constructor(
    private verses: Record<string, string>,
    private surahs: Record<number, { verseCount: number; names: string[] }>,
    private books: Record<
      string,
      { declared?: number; rows: Record<number, string> }
    >,
  ) {}

  describe(): string {
    return 'in-memory fixtures (self-test)';
  }
  async surahInfo(surahId: number): Promise<SurahInfo | null> {
    const s = this.surahs[surahId];
    if (!s) return null;
    const seeded = Object.keys(this.verses).filter((k) =>
      k.startsWith(`${surahId}:`),
    ).length;
    return { seededVerses: seeded, declaredVerseCount: s.verseCount, names: s.names };
  }
  async quranVerses(surahId: number, numbers: number[]) {
    const out = new Map<number, string>();
    for (const n of numbers) {
      const t = this.verses[`${surahId}:${n}`];
      if (t !== undefined) out.set(n, t);
    }
    return out;
  }
  async bookInfo(name: string) {
    const b = this.books[name];
    if (!b) return null;
    const seededHadiths = Object.keys(b.rows).length;
    return { seededHadiths, totalHadiths: b.declared ?? seededHadiths };
  }
  async hadiths(name: string, numbers: number[]) {
    const out = new Map<number, string>();
    const rows = this.books[name]?.rows ?? {};
    for (const n of numbers) if (rows[n] !== undefined) out.set(n, rows[n]);
    return out;
  }
  async close() {
    /* nothing to close */
  }
}

async function runSelfTest(books: BookResolver): Promise<number> {
  // Full ayat, with the diacritics and waqf marks the real corpus carries.
  const AYAH_2_153 =
    'يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ';
  // Quran 65:2 — the real ayah is long; the shipped bug quoted only the
  // closing clause "wa man yattaqi-llaha yaj'al lahu makhrajan".
  const AYAH_65_2_FULL =
    'فَإِذَا بَلَغْنَ أَجَلَهُنَّ فَأَمْسِكُوهُنَّ بِمَعْرُوفٍ أَوْ فَارِقُوهُنَّ بِمَعْرُوفٍ وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا';
  const AYAH_65_2_CLAUSE =
    'وَمَن يَتَّقِ اللهَ يَجْعَل لَّهُ مَخْرَجًا';
  const AYAH_94_5 =
    'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا';
  const AYAH_94_6 =
    'إِنَّ مَعَ الْعُسْرِ يُسْرًا';
  const HADITH_6363 =
    'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ';
  const UNRELATED =
    'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ';

  // Uthmani spelling of 2:153 as the seeded corpus actually stores it:
  // \u064a\u0670\u0653\u0623... (no free-standing alef) and \u0635\u0644\u0648\u0629 rather than \u0635\u0644\u0627\u0629.
  const AYAH_2_153_UTHMANI =
    '\u064a\u064e\u0640\u0670\u0653\u0623\u064e\u064a\u0651\u064f\u0647\u064e\u0627 \u0671\u0644\u0651\u064e\u0630\u0650\u064a\u0646\u064e \u0621\u064e\u0627\u0645\u064e\u0646\u064f\u0648\u0627\u0652 \u0671\u0633\u06e1\u062a\u064e\u0639\u0650\u064a\u0646\u064f\u0648\u0627\u0652 \u0628\u0650\u0671\u0644\u0635\u0651\u064e\u0628\u06e1\u0631\u0650 \u0648\u064e\u0671\u0644\u0635\u0651\u064e\u0644\u064e\u0648\u0670\u0629\u0650\u06da \u0625\u0650\u0646\u0651\u064e \u0671\u0644\u0644\u0651\u064e\u0647\u064e \u0645\u064e\u0639\u064e \u0671\u0644\u0635\u0651\u064e\u0627\u0628\u0650\u0631\u0650\u064a\u0646\u064e';

  const corpus = new FixtureCorpus(
    {
      '2:153': AYAH_2_153,
      '3:200': AYAH_2_153_UTHMANI,
      '65:2': AYAH_65_2_FULL,
      '94:5': AYAH_94_5,
      '94:6': AYAH_94_6,
    },
    {
      2: { verseCount: 286, names: ['The Cow', 'Al-Baqarah'] },
      3: { verseCount: 200, names: ['The Family of Imran', "Ali 'Imran"] },
      65: { verseCount: 12, names: ['The Divorce', 'At-Talaq'] },
      94: { verseCount: 8, names: ['The Relief', 'Ash-Sharh'] },
      // declared 12 ayat but only 65:2 seeded — the partial-corpus case
      // (surah 65 above doubles as the partially-seeded fixture)
    },
    {
      // fully seeded: a missing number here is a real fabrication
      'Sahih al-Bukhari': { rows: { 6363: HADITH_6363 }, declared: 1 },
      'Sunan Abu Dawud': {
        rows: { 4781: UNRELATED, 1522: UNRELATED, 4784: UNRELATED },
        declared: 3,
      },
      'Jami at-Tirmidhi': { rows: { 3524: UNRELATED }, declared: 1 },
      // deliberately present-but-empty: the "configured, never seeded" case
      'Sunan Ibn Majah': { rows: {} },
      // partially seeded, as Sahih al-Bukhari actually is in this database
      // (7563 rows against a declared 7589)
      "Sunan an-Nasa'i": { rows: { 10: UNRELATED }, declared: 500 },
    },
  );

  interface Case {
    what: string;
    source: string;
    arabic: string;
    status: Status;
    verdict?: TextVerdict;
    /** substring that must appear in the detail/textDetail */
    expectIn?: string;
  }

  const cases: Case[] = [
    // --- parsing ---------------------------------------------------------
    {
      what: 'compound source naming two different sources',
      source: 'Quran 16:98 / Abu Daud 4781',
      arabic: UNRELATED,
      status: 'FAIL',
      expectIn: 'names 2 sources',
    },
    {
      what: 'surah number outside 1-114',
      source: 'Quran 115:1',
      arabic: UNRELATED,
      status: 'FAIL',
      expectIn: 'outside the Quran',
    },
    {
      what: 'backwards verse range',
      source: 'Quran 94:6-5',
      arabic: UNRELATED,
      status: 'FAIL',
      expectIn: 'runs backwards',
    },
    {
      what: 'free text that is not a citation at all',
      source: 'Authentic hadith',
      arabic: UNRELATED,
      status: 'FAIL',
      expectIn: 'not a recognised citation',
    },
    {
      what: 'hadith cited with a volume-style colon reference',
      source: 'Bukhari 1:2',
      arabic: UNRELATED,
      status: 'FAIL',
      expectIn: 'verse-style',
    },
    // --- alias normalisation (all three live spellings + canonical) -------
    {
      what: 'alias "Abu Daud" folds onto Sunan Abu Dawud',
      source: 'Abu Daud 4781',
      arabic: UNRELATED,
      status: 'PASS',
      verdict: 'EXACT',
    },
    {
      what: 'alias "Abu Dawud" folds onto Sunan Abu Dawud',
      source: 'Abu Dawud 1522',
      arabic: UNRELATED,
      status: 'PASS',
      verdict: 'EXACT',
    },
    {
      what: 'alias "Sunan Abi Dawud" folds onto Sunan Abu Dawud',
      source: 'Sunan Abi Dawud 4784',
      arabic: UNRELATED,
      status: 'PASS',
      verdict: 'EXACT',
    },
    {
      what: 'alias "Tirmidhi" folds onto Jami at-Tirmidhi',
      source: 'Tirmidhi 3524',
      arabic: UNRELATED,
      status: 'PASS',
      verdict: 'EXACT',
    },
    // --- resolution ------------------------------------------------------
    {
      what: 'fabricated verse number in a seeded surah',
      source: 'Quran 2:999',
      arabic: UNRELATED,
      status: 'FAIL',
      expectIn: 'no such verse',
    },
    {
      what: 'fabricated hadith number in a seeded book',
      source: 'Sahih al-Bukhari 999999',
      arabic: UNRELATED,
      status: 'FAIL',
      expectIn: 'no hadith number',
    },
    {
      what: 'collection outside the seeded ten is unverifiable, not a pass',
      source: 'Musnad Ahmad 12345',
      arabic: UNRELATED,
      status: 'UNVERIFIABLE',
      expectIn: 'not one of the',
    },
    {
      what: 'configured book with no rows seeded is unverifiable',
      source: 'Sunan Ibn Majah 1',
      arabic: UNRELATED,
      status: 'UNVERIFIABLE',
      expectIn: 'no rows in hadiths',
    },
    {
      what: 'surah absent from the corpus is unverifiable',
      source: 'Quran 36:1',
      arabic: UNRELATED,
      status: 'UNVERIFIABLE',
      expectIn: 'not seeded',
    },
    // --- Arabic comparison ------------------------------------------------
    {
      what: 'identical text modulo diacritics and waqf marks',
      source: 'Quran 2:153',
      arabic:
        'يا أيها الذين آمنوا استعينوا بالصبر والصلاة إن الله مع الصابرين',
      status: 'PASS',
      verdict: 'EXACT',
    },
    {
      what: 'THE SHIPPED BUG: At-Talaq 65:2 quoting only the closing clause',
      source: 'Quran 65:2',
      arabic: AYAH_65_2_CLAUSE,
      status: 'PASS',
      verdict: 'EXCERPT',
      expectIn: 'partial clause',
    },
    {
      what: 'verse range 94:5-6 resolves and matches end to end',
      source: 'Quran 94:5-6',
      arabic: AYAH_94_5 + ' ۔ ' + AYAH_94_6,
      status: 'PASS',
      verdict: 'EXACT',
    },
    {
      what: 'genuinely different text is a mismatch, not an excerpt',
      source: 'Quran 2:153',
      arabic: UNRELATED,
      status: 'PASS',
      verdict: 'MISMATCH',
    },
    {
      what: 'remedy carrying more than the cited passage',
      source: 'Quran 94:5',
      arabic: AYAH_94_5 + ' ' + UNRELATED,
      status: 'PASS',
      verdict: 'SUPERSET',
    },
    {
      what: 'missing verse in a PARTIALLY seeded surah is unverifiable, not a failure',
      source: 'Quran 65:7',
      arabic: UNRELATED,
      status: 'UNVERIFIABLE',
      expectIn: 'partially seeded',
    },
    {
      what: 'verse past the end of the surah is still a failure',
      source: 'Quran 65:99',
      arabic: UNRELATED,
      status: 'FAIL',
      expectIn: 'no such verse',
    },
    {
      what: 'missing hadith in a PARTIALLY seeded book is unverifiable',
      source: "Sunan an-Nasa'i 11",
      arabic: UNRELATED,
      status: 'UNVERIFIABLE',
      expectIn: 'partially seeded',
    },
    {
      what: 'hadith number past the declared total is still a failure',
      source: "Sunan an-Nasa'i 99999",
      arabic: UNRELATED,
      status: 'FAIL',
      expectIn: 'no hadith number',
    },
    {
      what: "Uthmani corpus vs imla'i remedy is a pass, not a false mismatch",
      source: 'Quran 3:200',
      arabic: AYAH_2_153,
      status: 'PASS',
      verdict: 'EXACT_ORTHOGRAPHY',
      expectIn: 'long-vowel spelling',
    },
    {
      what: 'excerpt still detected across the orthography difference',
      source: 'Quran 3:200',
      arabic:
        '\u0625\u0650\u0646\u0651\u064e \u0627\u0644\u0644\u0651\u064e\u0647\u064e \u0645\u064e\u0639\u064e \u0627\u0644\u0635\u0651\u064e\u0627\u0628\u0650\u0631\u0650\u064a\u0646\u064e',
      status: 'PASS',
      verdict: 'EXCERPT',
      expectIn: 'partial clause',
    },
    {
      what: 'orthography tier does not rescue genuinely different text',
      source: 'Quran 3:200',
      arabic: UNRELATED,
      status: 'PASS',
      verdict: 'MISMATCH',
    },
    {
      what: 'hadith excerpt of a longer narration is flagged, not passed',
      source: 'Sahih al-Bukhari 6363',
      arabic:
        'اللهم إني أعوذ بك',
      status: 'PASS',
      verdict: 'EXCERPT',
    },
  ];

  console.log('');
  console.log(BAR);
  console.log('  SELF-TEST — parsing, alias folding, resolution, Arabic comparison');
  console.log('  (fixtures only; no database connection)');
  console.log(BAR);

  let failed = 0;
  for (const c of cases) {
    const r = await verifyRemedy(
      'fixture',
      { arabicText: c.arabic, translation: '', source: c.source },
      books,
      corpus,
    );
    const problems: string[] = [];
    if (r.status !== c.status) {
      problems.push(`status ${r.status}, expected ${c.status}`);
    }
    if (c.verdict && r.textVerdict !== c.verdict) {
      problems.push(`verdict ${r.textVerdict}, expected ${c.verdict}`);
    }
    if (c.expectIn) {
      const hay = `${r.detail} ${r.textDetail}`;
      if (!hay.includes(c.expectIn)) {
        problems.push(`detail did not mention "${c.expectIn}" (got: ${hay.trim()})`);
      }
    }
    if (problems.length === 0) {
      const tag = c.verdict ? `${r.status}/${r.textVerdict}` : r.status;
      console.log(`  ok    ${c.what}  [${tag}]`);
    } else {
      failed++;
      console.log(`  FAIL  ${c.what}`);
      for (const p of problems) console.log(`          ${p}`);
    }
  }

  // Alias table sanity: every alias target must be a real canonical book.
  if (books.aliasWarnings.length > 0) {
    failed += books.aliasWarnings.length;
    for (const w of books.aliasWarnings) console.log(`  FAIL  ${w}`);
  }

  console.log(BAR);
  console.log(
    `  ${cases.length - failed}/${cases.length} self-test cases passed` +
      (failed > 0 ? `  (${failed} FAILED)` : ''),
  );
  console.log(BAR);
  console.log('');
  return failed > 0 ? EXIT_FAILURES : EXIT_OK;
}

// ===========================================================================
// 9. Entry point
// ===========================================================================

async function main(): Promise<number> {
  let books: BookResolver;
  try {
    books = new BookResolver(loadCanonicalBookNames());
  } catch (err: any) {
    console.error(`\nCannot read the hadith book configuration: ${scrub(err.message)}\n`);
    return EXIT_INFRA;
  }

  if (SELF_TEST) return runSelfTest(books);

  let emotions: SeedEmotion[];
  try {
    emotions = loadSeedEmotions();
  } catch (err: any) {
    console.error(`\nCannot read prisma/seed-feelings.ts: ${scrub(err.message)}\n`);
    return EXIT_INFRA;
  }

  const citations = emotions.flatMap((e) =>
    (e.remedies ?? []).map((r) => ({ slug: e.slug, remedy: r })),
  );
  console.log(
    `\nRead ${citations.length} remedies across ${emotions.length} emotions from prisma/seed-feelings.ts`,
  );
  console.log(
    `Canonical collections (from prisma/seed-hadiths.ts): ${books.canonical.length}`,
  );

  let corpus: Corpus;
  try {
    corpus = await DbCorpus.connect();
  } catch (err: any) {
    console.error('');
    console.error(
      `Cannot reach the database, so no citation could be verified: ${scrub(
        err?.message ?? String(err),
      )}`,
    );
    console.error(
      'This script is a gate — it does not pass when the corpus is unavailable.',
    );
    console.error(
      'Run with --self-test to exercise the parsing and normalisation logic offline.',
    );
    console.error('');
    return EXIT_INFRA;
  }

  try {
    const results: Result[] = [];
    for (const { slug, remedy } of citations) {
      results.push(await verifyRemedy(slug, remedy, books, corpus));
    }
    return report(results, books.aliasWarnings, corpus.describe());
  } catch (err: any) {
    console.error('');
    console.error(`Database read failed: ${scrub(err?.message ?? String(err))}`);
    console.error('');
    return EXIT_INFRA;
  } finally {
    await corpus.close();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: any) => {
    console.error(`\nUnexpected error: ${scrub(err?.message ?? String(err))}\n`);
    process.exitCode = EXIT_INFRA;
  });
