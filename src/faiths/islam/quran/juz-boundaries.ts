/**
 * The 30 juz boundaries of the standard Hafs division.
 *
 * Frozen contract: `docs/contracts/quran-juz-api.md`. Where this file and the
 * contract disagree, the contract is right and this file is the bug.
 *
 * ## Why a constant and not a table
 *
 * These 30 pairs are Qur'anic structure: they have not changed in fourteen
 * centuries and they will not change in a release. Putting them in Postgres
 * would buy joinability we never use — a juz is resolved as a *range* over
 * `(surah_id, verse_number)`, which `quran_verses`' own `@@unique` index
 * already serves, so a `quran_juz` table would be joined to nothing. Against
 * that it would cost a schema migration on a live production database (and
 * `prisma migrate dev` is forbidden here), a seed step that could silently not
 * run, and a correctness gate that could only be checked against a live
 * connection. As a constant the table is diffable in review, importable by the
 * offline spec, and impossible to have "half seeded".
 *
 * ## Provenance — do not hand-edit
 *
 * Derived on 2026-10-10 from the `verse_mapping` of
 * `https://api.quran.com/api/v4/juzs` (Quran.com API v4, Hafs/Madani
 * muṣḥaf). That endpoint returns each juz twice (two id series, 1–30 and
 * 61–90); both copies of all 30 were checked to carry identical
 * `verse_mapping` before deduplication.
 *
 * The table is *not* self-certifying: `juz-boundaries.spec.ts` re-derives the
 * verse counts from an independently sourced per-surah verse-count table and
 * runs the contract's three assertions over the result. If you change a pair
 * here, that spec is what decides whether you were right.
 *
 * Deliberately absent: `verseCount`. Per contract, counts are computed from
 * the seeded `quran_verses` rows at runtime — never stored beside the
 * boundaries, or the totals assertion would be comparing the table to itself.
 */

/** One end of a juz, as a natural `(surah, verse)` key. */
export interface JuzEndpoint {
  surahId: number;
  verseNumber: number;
}

/** A juz, as the inclusive verse range `[start, end]` in canonical order. */
export interface JuzBoundary {
  number: number;
  start: JuzEndpoint;
  end: JuzEndpoint;
}

/** Juz numbers are 1..30 inclusive; anything else is a `400` (contract §2). */
export const JUZ_MIN = 1;
export const JUZ_MAX = 30;

/** Reader pagination bounds (contract §2). */
export const JUZ_PAGE_DEFAULT = 1;
export const JUZ_LIMIT_DEFAULT = 50;
export const JUZ_LIMIT_MAX = 300;

export const JUZ_BOUNDARIES: readonly JuzBoundary[] = [
  {
    number: 1,
    start: { surahId: 1, verseNumber: 1 },
    end: { surahId: 2, verseNumber: 141 },
  },
  {
    number: 2,
    start: { surahId: 2, verseNumber: 142 },
    end: { surahId: 2, verseNumber: 252 },
  },
  {
    number: 3,
    start: { surahId: 2, verseNumber: 253 },
    end: { surahId: 3, verseNumber: 92 },
  },
  {
    number: 4,
    start: { surahId: 3, verseNumber: 93 },
    end: { surahId: 4, verseNumber: 23 },
  },
  {
    number: 5,
    start: { surahId: 4, verseNumber: 24 },
    end: { surahId: 4, verseNumber: 147 },
  },
  {
    number: 6,
    start: { surahId: 4, verseNumber: 148 },
    end: { surahId: 5, verseNumber: 81 },
  },
  {
    number: 7,
    start: { surahId: 5, verseNumber: 82 },
    end: { surahId: 6, verseNumber: 110 },
  },
  {
    number: 8,
    start: { surahId: 6, verseNumber: 111 },
    end: { surahId: 7, verseNumber: 87 },
  },
  {
    number: 9,
    start: { surahId: 7, verseNumber: 88 },
    end: { surahId: 8, verseNumber: 40 },
  },
  {
    number: 10,
    start: { surahId: 8, verseNumber: 41 },
    end: { surahId: 9, verseNumber: 92 },
  },
  {
    number: 11,
    start: { surahId: 9, verseNumber: 93 },
    end: { surahId: 11, verseNumber: 5 },
  },
  {
    number: 12,
    start: { surahId: 11, verseNumber: 6 },
    end: { surahId: 12, verseNumber: 52 },
  },
  {
    number: 13,
    start: { surahId: 12, verseNumber: 53 },
    end: { surahId: 14, verseNumber: 52 },
  },
  {
    number: 14,
    start: { surahId: 15, verseNumber: 1 },
    end: { surahId: 16, verseNumber: 128 },
  },
  {
    number: 15,
    start: { surahId: 17, verseNumber: 1 },
    end: { surahId: 18, verseNumber: 74 },
  },
  {
    number: 16,
    start: { surahId: 18, verseNumber: 75 },
    end: { surahId: 20, verseNumber: 135 },
  },
  {
    number: 17,
    start: { surahId: 21, verseNumber: 1 },
    end: { surahId: 22, verseNumber: 78 },
  },
  {
    number: 18,
    start: { surahId: 23, verseNumber: 1 },
    end: { surahId: 25, verseNumber: 20 },
  },
  {
    number: 19,
    start: { surahId: 25, verseNumber: 21 },
    end: { surahId: 27, verseNumber: 55 },
  },
  {
    number: 20,
    start: { surahId: 27, verseNumber: 56 },
    end: { surahId: 29, verseNumber: 45 },
  },
  {
    number: 21,
    start: { surahId: 29, verseNumber: 46 },
    end: { surahId: 33, verseNumber: 30 },
  },
  {
    number: 22,
    start: { surahId: 33, verseNumber: 31 },
    end: { surahId: 36, verseNumber: 27 },
  },
  {
    number: 23,
    start: { surahId: 36, verseNumber: 28 },
    end: { surahId: 39, verseNumber: 31 },
  },
  {
    number: 24,
    start: { surahId: 39, verseNumber: 32 },
    end: { surahId: 41, verseNumber: 46 },
  },
  {
    number: 25,
    start: { surahId: 41, verseNumber: 47 },
    end: { surahId: 45, verseNumber: 37 },
  },
  {
    number: 26,
    start: { surahId: 46, verseNumber: 1 },
    end: { surahId: 51, verseNumber: 30 },
  },
  {
    number: 27,
    start: { surahId: 51, verseNumber: 31 },
    end: { surahId: 57, verseNumber: 29 },
  },
  {
    number: 28,
    start: { surahId: 58, verseNumber: 1 },
    end: { surahId: 66, verseNumber: 12 },
  },
  {
    number: 29,
    start: { surahId: 67, verseNumber: 1 },
    end: { surahId: 77, verseNumber: 50 },
  },
  {
    number: 30,
    start: { surahId: 78, verseNumber: 1 },
    end: { surahId: 114, verseNumber: 6 },
  },
];

/**
 * The juz with the given number, or `undefined` when it is out of range.
 * Indexed rather than scanned so `/juz/:number` stays O(1).
 */
const BY_NUMBER = new Map<number, JuzBoundary>(
  JUZ_BOUNDARIES.map((juz) => [juz.number, juz]),
);

export function getJuzBoundary(number: number): JuzBoundary | undefined {
  return BY_NUMBER.get(number);
}

/**
 * Every surah a juz touches, ascending. A juz is contiguous in canonical
 * order, so the surahs it spans are exactly the closed integer interval
 * `[start.surahId, end.surahId]` — the spec checks that against the source's
 * own `verse_mapping` keys rather than taking it on trust.
 */
export function surahIdsForJuz(juz: JuzBoundary): number[] {
  const ids: number[] = [];
  for (let id = juz.start.surahId; id <= juz.end.surahId; id++) ids.push(id);
  return ids;
}
