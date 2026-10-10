import {
  JUZ_BOUNDARIES,
  JUZ_MAX,
  JUZ_MIN,
  getJuzBoundary,
  surahIdsForJuz,
} from './juz-boundaries';
import {
  SURAH_VERSE_COUNTS,
  TOTAL_VERSES_IN_QURAN,
} from './__fixtures__/surah-verse-counts';

/**
 * The correctness gate of `docs/contracts/quran-juz-api.md` §"Correctness
 * gate". Juz boundaries are Qur'anic structure: getting one wrong shows
 * somebody the wrong verses as their daily portion, and it fails silently —
 * the endpoint still returns 200 and a plausible-looking page. So the contract
 * names three mechanical assertions and this file is them.
 *
 * ## Why this spec touches no database
 *
 * `DATABASE_URL` points at a shared RDS instance holding live user data, and
 * `PrismaService`'s constructor opens a real `pg.Pool` against it. CI must be
 * able to fail this gate without a network. The per-surah verse counts below
 * stand in for the seeded `quran_verses` rows.
 *
 * ## Why the counts below are not cheating
 *
 * The contract's warning is precise: if verse counts were stored beside the
 * boundaries, assertion 1 would compare the table to itself and prove nothing.
 * So the two inputs here come from *different* sources and live in
 * *different* files:
 *
 *   - the boundaries, in `juz-boundaries.ts`, from Quran.com API v4 `/juzs`;
 *   - the per-surah verse counts, in `__fixtures__/surah-verse-counts.ts`,
 *     from `quran-json@3.1.2` — which is
 *     the exact dataset `prisma/seed-islamic-features.ts` seeds
 *     `quran_surahs` / `quran_verses` from, making it a faithful offline
 *     proxy for the rows the service counts at runtime.
 *
 * Neither derives from the other. A juz's verse count is *computed* here by
 * walking its surahs — the boundary table contributes ranges only, never a
 * count.
 *
 * Keep them apart. If a later change moves those counts next to the
 * boundaries, or back-fills them from the boundaries, this gate silently stops
 * being a gate.
 */

/**
 * A juz's verse count, computed from the per-surah counts by walking the
 * surahs it spans — partial at both ends, whole in between. This is the same
 * arithmetic `JuzService` performs over counts read from `quran_verses`.
 */
function verseCountOf(juz: { start: any; end: any }): number {
  let total = 0;
  for (const surahId of surahIdsForJuz(juz as any)) {
    const from = surahId === juz.start.surahId ? juz.start.verseNumber : 1;
    const to =
      surahId === juz.end.surahId
        ? juz.end.verseNumber
        : SURAH_VERSE_COUNTS[surahId];
    total += to - from + 1;
  }
  return total;
}

describe("juz boundary table — structural sanity", () => {
  it("has exactly 30 juz, numbered 1..30 ascending", () => {
    expect(JUZ_BOUNDARIES).toHaveLength(30);
    expect(JUZ_BOUNDARIES.map((j) => j.number)).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
    expect(getJuzBoundary(JUZ_MIN)).toBeDefined();
    expect(getJuzBoundary(JUZ_MAX)).toBeDefined();
    expect(getJuzBoundary(0)).toBeUndefined();
    expect(getJuzBoundary(31)).toBeUndefined();
  });

  it("names only real verses — every endpoint exists in its surah", () => {
    for (const juz of JUZ_BOUNDARIES) {
      for (const end of [juz.start, juz.end]) {
        expect(SURAH_VERSE_COUNTS[end.surahId]).toBeDefined();
        expect(end.verseNumber).toBeGreaterThanOrEqual(1);
        expect(end.verseNumber).toBeLessThanOrEqual(
          SURAH_VERSE_COUNTS[end.surahId],
        );
      }
      // A juz runs forward: its end is at or after its start.
      const forward =
        juz.end.surahId > juz.start.surahId ||
        (juz.end.surahId === juz.start.surahId &&
          juz.end.verseNumber >= juz.start.verseNumber);
      expect({ juz: juz.number, forward }).toEqual({
        juz: juz.number,
        forward: true,
      });
    }
  });

  /**
   * The fixture's own sanity. Not one of the contract's three, but if this
   * drifts, assertion 1 would be measuring a broken ruler.
   */
  it("fixture: the 114 per-surah counts sum to 6236", () => {
    const ids = Object.keys(SURAH_VERSE_COUNTS).map(Number);
    expect(ids).toHaveLength(114);
    expect(Math.min(...ids)).toBe(1);
    expect(Math.max(...ids)).toBe(114);
    expect(ids.reduce((sum, id) => sum + SURAH_VERSE_COUNTS[id], 0)).toBe(
      TOTAL_VERSES_IN_QURAN,
    );
  });
});

describe("contract §correctness gate — assertion 1: totals", () => {
  it("sum of all 30 juz verse counts is exactly 6236", () => {
    const counts = JUZ_BOUNDARIES.map(verseCountOf);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(TOTAL_VERSES_IN_QURAN);
  });

  it("no juz is empty", () => {
    for (const juz of JUZ_BOUNDARIES) {
      expect({ juz: juz.number, count: verseCountOf(juz) }).toEqual({
        juz: juz.number,
        count: expect.any(Number),
      });
      expect(verseCountOf(juz)).toBeGreaterThan(0);
    }
  });
});

describe("contract §correctness gate — assertion 2: contiguity", () => {
  it("juz n's end is immediately followed by juz n+1's start", () => {
    for (let i = 0; i < JUZ_BOUNDARIES.length - 1; i++) {
      const end = JUZ_BOUNDARIES[i].end;
      const next = JUZ_BOUNDARIES[i + 1].start;

      // The successor of (s, v) in canonical order: the next verse of the
      // same surah, or verse 1 of the next surah when v was the last.
      const successor =
        end.verseNumber < SURAH_VERSE_COUNTS[end.surahId]
          ? { surahId: end.surahId, verseNumber: end.verseNumber + 1 }
          : { surahId: end.surahId + 1, verseNumber: 1 };

      expect({ after: JUZ_BOUNDARIES[i].number, next }).toEqual({
        after: JUZ_BOUNDARIES[i].number,
        next: successor,
      });
    }
  });

  /**
   * The stronger form of the same claim, and the one that would actually catch
   * a duplicated or skipped verse in the middle of the muṣḥaf: enumerate all
   * 6236 verses and assign each to a juz by range lookup. Every verse must
   * land in exactly one — that is no-gap and no-overlap simultaneously.
   */
  it("partitions all 6236 verses — each verse in exactly one juz", () => {
    const owners = new Map<string, number[]>();
    let enumerated = 0;

    for (let surahId = 1; surahId <= 114; surahId++) {
      for (let v = 1; v <= SURAH_VERSE_COUNTS[surahId]; v++) {
        enumerated++;
        const hits = JUZ_BOUNDARIES.filter((juz) => {
          const afterStart =
            surahId > juz.start.surahId ||
            (surahId === juz.start.surahId && v >= juz.start.verseNumber);
          const beforeEnd =
            surahId < juz.end.surahId ||
            (surahId === juz.end.surahId && v <= juz.end.verseNumber);
          return afterStart && beforeEnd;
        }).map((juz) => juz.number);
        if (hits.length !== 1) owners.set(`${surahId}:${v}`, hits);
      }
    }

    expect(enumerated).toBe(TOTAL_VERSES_IN_QURAN);
    // Any entry here is a verse owned by zero juz (a gap) or by more than one
    // (an overlap). The message names the verse so the bad pair is obvious.
    expect([...owners.entries()]).toEqual([]);
  });
});

describe("contract §correctness gate — assertion 3: endpoints", () => {
  it("juz 1 starts at 1:1", () => {
    expect(JUZ_BOUNDARIES[0].start).toEqual({ surahId: 1, verseNumber: 1 });
  });

  it("juz 30 ends at 114:6", () => {
    expect(JUZ_BOUNDARIES[29].end).toEqual({ surahId: 114, verseNumber: 6 });
  });

  it("juz 30 spans the 37 surahs the contract names (78..114)", () => {
    const ids = surahIdsForJuz(JUZ_BOUNDARIES[29]);
    expect(ids).toHaveLength(37);
    expect(ids[0]).toBe(78);
    expect(ids[36]).toBe(114);
  });
});
