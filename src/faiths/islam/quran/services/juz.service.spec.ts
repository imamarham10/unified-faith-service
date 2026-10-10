import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { JuzService } from './juz.service';
import { JUZ_BOUNDARIES, surahIdsForJuz } from '../juz-boundaries';
import { SURAH_VERSE_COUNTS } from '../__fixtures__/surah-verse-counts';

/**
 * Unit specs for `GET /juz` and `GET /juz/:number`
 * (`docs/contracts/quran-juz-api.md` §1, §2).
 *
 * ## No database
 *
 * `DATABASE_URL` points at a shared RDS instance holding live user data and
 * `PrismaService`'s constructor opens a real `pg.Pool` against it, so the real
 * provider is never instantiated — same reason the activity specs don't.
 *
 * ## What the double is for
 *
 * Two things, and the second is the interesting one.
 *
 * 1. It *evaluates* the `where` clause the service builds, against a synthetic
 *    muṣḥaf of all 6,236 verses. So "does the range predicate select exactly
 *    the juz and nothing either side of it" is a real assertion about the
 *    query, not a mock returning whatever the test wanted.
 * 2. It **counts statements**. This codebase has a documented history of
 *    per-item `await` loops — one endpoint made ~286 sequential round trips —
 *    and juz 30 spans 37 surahs, which is exactly the shape that invites one
 *    query per surah. So the specs below assert the query count is *the same*
 *    for a 37-surah juz as for a 1-surah juz. A regression that reintroduces
 *    the loop fails here rather than in production latency graphs.
 *
 * The double stays local to this file rather than being shared from under
 * `src/`: a shared helper would be compiled into `dist/` by `npm run build`,
 * carrying `jest.fn()` into the shipped bundle.
 */

const DEFAULT_AUTHOR = 'Saheeh International';
const PREMIUM_AUTHOR = 'Yusuf Ali';

interface FakeVerse {
  id: string;
  surahId: number;
  verseNumber: number;
  textArabic: string;
  textUthmani: string | null;
  textIndopak: string | null;
  translations: {
    language: string;
    authorName: string;
    isPremium: boolean;
    text: string;
  }[];
}

/** All 6,236 verses, shaped like `quran_verses` rows. */
function buildMushaf(): FakeVerse[] {
  const verses: FakeVerse[] = [];
  for (let surahId = 1; surahId <= 114; surahId++) {
    for (let n = 1; n <= SURAH_VERSE_COUNTS[surahId]; n++) {
      verses.push({
        id: `verse-${surahId}-${n}`,
        surahId,
        verseNumber: n,
        textArabic: `ar ${surahId}:${n}`,
        // Half the rows have no Uthmani script, as in the real table where
        // `text_uthmani` is nullable — the contract's `textUthmani` must
        // survive that as `null` rather than `undefined`.
        textUthmani: n % 2 === 0 ? null : `uth ${surahId}:${n}`,
        // A *different* null pattern from `textUthmani` on purpose: the two
        // columns are independently nullable in the table, and a shared
        // pattern would let a mapping that returned the wrong one pass.
        textIndopak: n % 3 === 0 ? null : `ind ${surahId}:${n}`,
        translations: [
          {
            language: 'en',
            authorName: DEFAULT_AUTHOR,
            isPremium: false,
            text: `free ${surahId}:${n}`,
          },
          {
            language: 'en',
            authorName: PREMIUM_AUTHOR,
            isPremium: true,
            text: `paid ${surahId}:${n}`,
          },
        ],
      });
    }
  }
  return verses;
}

const MUSHAF = buildMushaf();

/** Enough of Prisma's `where` grammar for the clauses this service builds. */
function matches(
  row: Record<string, any>,
  where: Record<string, any>,
): boolean {
  return Object.entries(where).every(([field, expected]) => {
    if (field === 'OR') {
      return (expected as any[]).some((clause) => matches(row, clause));
    }
    const actual = row[field];
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      const ops = expected as Record<string, any>;
      if ('gte' in ops && !(actual >= ops.gte)) return false;
      if ('gt' in ops && !(actual > ops.gt)) return false;
      if ('lte' in ops && !(actual <= ops.lte)) return false;
      if ('lt' in ops && !(actual < ops.lt)) return false;
      if ('equals' in ops && actual !== ops.equals) return false;
      return true;
    }
    return actual === expected;
  });
}

function makeHarness() {
  /** Every statement the service issues, in order, for counting. */
  const statements: string[] = [];

  const prisma = {
    quranSurah: {
      findMany: jest.fn(async ({ select }: any) => {
        statements.push('quranSurah.findMany');
        // The contract's example names are transliterations ("Al-Fatihah"),
        // not meanings ("The Opening"), so the service must not reach for
        // `nameEnglish`. Fail loudly if it ever does.
        if (select?.nameEnglish) {
          throw new Error('surahName must come from nameTransliteration');
        }
        return Array.from({ length: 114 }, (_, i) => ({
          id: i + 1,
          nameTransliteration: `Translit-${i + 1}`,
        }));
      }),
    },
    quranVerse: {
      groupBy: jest.fn(async () => {
        statements.push('quranVerse.groupBy');
        return Object.keys(SURAH_VERSE_COUNTS).map((id) => ({
          surahId: Number(id),
          _count: { _all: SURAH_VERSE_COUNTS[Number(id)] },
        }));
      }),
      findMany: jest.fn(async ({ where, orderBy, skip, take, select }: any) => {
        statements.push('quranVerse.findMany');
        expect(orderBy).toEqual([{ surahId: 'asc' }, { verseNumber: 'asc' }]);

        const selected = MUSHAF.filter((v) => matches(v, where)).sort(
          (a, b) => a.surahId - b.surahId || a.verseNumber - b.verseNumber,
        );
        const page = selected.slice(skip ?? 0, (skip ?? 0) + (take ?? 1e9));

        const translationWhere = select?.translations?.where ?? {};
        const translationTake = select?.translations?.take ?? 1e9;
        return page.map((v) => ({
          ...v,
          translations: v.translations
            .filter((t) => matches(t, translationWhere))
            .slice(0, translationTake)
            .map((t) => ({ text: t.text })),
        }));
      }),
    },
  };

  /** In-memory stand-in for the Redis-backed cache. */
  const store = new Map<string, any>();
  const cache = {
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: any) => {
      // Round-trip through JSON: the real cache is Redis-backed, so anything
      // that does not survive serialisation (a `Map`, say) must break here.
      store.set(key, JSON.parse(JSON.stringify(value)));
    }),
  };

  return { prisma, cache, statements, store };
}

async function makeService(harness = makeHarness()) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      JuzService,
      { provide: PrismaService, useValue: harness.prisma },
      { provide: CACHE_MANAGER, useValue: harness.cache },
    ],
  }).compile();
  return { service: moduleRef.get(JuzService), ...harness };
}

describe('GET /juz — the chooser (contract §1)', () => {
  it('returns exactly 30 entries, ascending', async () => {
    const { service } = await makeService();
    const index = await service.getJuzIndex();

    expect(index).toHaveLength(30);
    expect(index.map((j) => j.number)).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
  });

  it('matches the contract example for juz 1', async () => {
    const { service } = await makeService();
    const [juz1] = await service.getJuzIndex();

    expect(juz1).toEqual({
      number: 1,
      start: { surahId: 1, surahName: 'Translit-1', verseNumber: 1 },
      end: { surahId: 2, surahName: 'Translit-2', verseNumber: 141 },
      verseCount: 148,
      surahIds: [1, 2],
    });
  });

  it('lists every surah a juz touches, in order', async () => {
    const { service } = await makeService();
    const index = await service.getJuzIndex();

    const juz30 = index[29];
    expect(juz30.surahIds).toHaveLength(37);
    expect(juz30.surahIds[0]).toBe(78);
    expect(juz30.surahIds[36]).toBe(114);

    for (const juz of index) {
      expect(juz.surahIds[0]).toBe(juz.start.surahId);
      expect(juz.surahIds[juz.surahIds.length - 1]).toBe(juz.end.surahId);
    }
  });

  it('derives verse counts from the verse rows, and they still total 6236', async () => {
    const { service, prisma } = await makeService();
    const index = await service.getJuzIndex();

    // The counts come from `quran_verses` via groupBy — not from the
    // denormalised `quran_surahs.verse_count` column, and not from anything
    // stored beside the boundaries.
    expect(prisma.quranVerse.groupBy).toHaveBeenCalledTimes(1);
    expect(index.reduce((sum, j) => sum + j.verseCount, 0)).toBe(6236);
  });

  it('issues 2 statements cold and 0 warm — not 30, and not 30 × span', async () => {
    const harness = makeHarness();
    const { service, statements } = await makeService(harness);

    await service.getJuzIndex();
    expect(statements).toEqual(['quranSurah.findMany', 'quranVerse.groupBy']);

    statements.length = 0;
    await service.getJuzIndex();
    expect(statements).toEqual([]);
  });
});

describe('GET /juz/:number — the reader (contract §2)', () => {
  it('rejects out-of-range juz numbers with 400, not 404', async () => {
    const { service } = await makeService();
    for (const bad of [0, 31, -1, 1.5, NaN, 1000]) {
      await expect(
        service.getJuz(bad, { page: 1, limit: 50 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('matches the contract example for juz 2', async () => {
    const { service } = await makeService();
    const result = await service.getJuz(2, { page: 1, limit: 50 });

    expect(result.number).toBe(2);
    expect(result.verseCount).toBe(111);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.totalPages).toBe(3);
    expect(result.verses).toHaveLength(50);
    expect(result.verses[0]).toEqual({
      id: 'verse-2-142',
      surahId: 2,
      surahName: 'Translit-2',
      verseNumber: 142,
      indexInJuz: 1,
      textArabic: 'ar 2:142',
      textUthmani: null,
      // 142 is even (no Uthmani) but not a multiple of 3, so this one row
      // carries a null in one script column and a value in the other.
      textIndopak: 'ind 2:142',
      translation: 'free 2:142',
    });
  });

  /**
   * The predicate is the load-bearing part: an off-by-one in it would serve
   * the wrong daily portion just as surely as a bad boundary would, and would
   * do it with a 200 response. So check all 30 against the synthetic muṣḥaf.
   */
  it('selects exactly the juz — right count, right first and last verse, for all 30', async () => {
    const { service } = await makeService();

    for (const boundary of JUZ_BOUNDARIES) {
      const expected = surahIdsForJuz(boundary).reduce((sum, surahId) => {
        const from =
          surahId === boundary.start.surahId ? boundary.start.verseNumber : 1;
        const to =
          surahId === boundary.end.surahId
            ? boundary.end.verseNumber
            : SURAH_VERSE_COUNTS[surahId];
        return sum + (to - from + 1);
      }, 0);

      const all = await service.getJuz(boundary.number, {
        page: 1,
        limit: 300,
      });
      expect({ juz: boundary.number, count: all.verseCount }).toEqual({
        juz: boundary.number,
        count: expected,
      });

      const first = all.verses[0];
      expect({
        surahId: first.surahId,
        verseNumber: first.verseNumber,
      }).toEqual(boundary.start);

      const lastPage = await service.getJuz(boundary.number, {
        page: Math.ceil(expected / 300),
        limit: 300,
      });
      const last = lastPage.verses[lastPage.verses.length - 1];
      expect({ surahId: last.surahId, verseNumber: last.verseNumber }).toEqual(
        boundary.end,
      );
    }
  });

  it('numbers indexInJuz across the whole juz, not the page', async () => {
    const { service } = await makeService();

    const page1 = await service.getJuz(2, { page: 1, limit: 50 });
    const page2 = await service.getJuz(2, { page: 2, limit: 50 });
    const page3 = await service.getJuz(2, { page: 3, limit: 50 });

    expect(page1.verses[0].indexInJuz).toBe(1);
    expect(page1.verses[49].indexInJuz).toBe(50);
    expect(page2.verses[0].indexInJuz).toBe(51);
    expect(page3.verses[0].indexInJuz).toBe(101);
    // Juz 2 has 111 verses, so the last page is a short one.
    expect(page3.verses).toHaveLength(11);
    expect(page3.verses[10].indexInJuz).toBe(111);
    expect(page3.verses[10].verseNumber).toBe(252);
  });

  it('crosses surah boundaries within a page, carrying each verse its own surah name', async () => {
    const { service } = await makeService();
    // Juz 1 is 1:1–2:141: its first page must contain the last verse of
    // Al-Fatihah and the first of Al-Baqarah, back to back.
    const page = await service.getJuz(1, { page: 1, limit: 10 });

    expect(page.verses[6]).toMatchObject({
      surahId: 1,
      verseNumber: 7,
      surahName: 'Translit-1',
      indexInJuz: 7,
    });
    expect(page.verses[7]).toMatchObject({
      surahId: 2,
      verseNumber: 1,
      surahName: 'Translit-2',
      indexInJuz: 8,
    });
  });

  it('returns an empty page past the end rather than an error', async () => {
    const { service } = await makeService();
    const result = await service.getJuz(2, { page: 99, limit: 50 });

    expect(result.verses).toEqual([]);
    expect(result.verseCount).toBe(111);
    expect(result.totalPages).toBe(3);
  });

  it('attaches the app-default translation when none is named', async () => {
    const { service } = await makeService();
    const result = await service.getJuz(30, { page: 1, limit: 5 });
    expect(result.verses[0].translation).toBe('free 78:1');
  });

  it('never serves a premium translation on this public route', async () => {
    const { service } = await makeService();
    const result = await service.getJuz(30, {
      translationId: PREMIUM_AUTHOR,
      page: 1,
      limit: 5,
    });
    // The paid edition resolves to null rather than being handed out free.
    expect(result.verses.map((v) => v.translation)).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('yields null translation for an unknown translationId, not an error', async () => {
    const { service } = await makeService();
    const result = await service.getJuz(30, {
      translationId: 'No Such Edition',
      page: 1,
      limit: 3,
    });
    expect(result.verses[0].translation).toBeNull();
  });
});

describe('performance — statements are flat in the span of the juz', () => {
  it('a 37-surah juz costs the same as a 1-surah juz', async () => {
    const wide = makeHarness();
    const narrow = makeHarness();

    const a = await makeService(wide);
    const b = await makeService(narrow);

    await a.service.getJuz(30, { page: 1, limit: 50 }); // spans 37 surahs
    await b.service.getJuz(2, { page: 1, limit: 50 }); // spans 1 surah

    expect(wide.statements).toEqual(narrow.statements);
    expect(wide.statements).toEqual([
      'quranSurah.findMany',
      'quranVerse.groupBy',
      'quranVerse.findMany',
    ]);
  });

  it('is 1 statement on a warm cache, whatever the juz', async () => {
    const harness = makeHarness();
    const { service, statements } = await makeService(harness);

    await service.getJuz(1, { page: 1, limit: 50 });
    statements.length = 0;

    for (const n of [1, 15, 30]) {
      await service.getJuz(n, { page: 1, limit: 50 });
    }
    expect(statements).toEqual([
      'quranVerse.findMany',
      'quranVerse.findMany',
      'quranVerse.findMany',
    ]);
  });

  it('builds a fixed three-branch range predicate, not one branch per surah', async () => {
    const harness = makeHarness();
    const { service, prisma } = await makeService(harness);

    await service.getJuz(30, { page: 1, limit: 50 });
    const { where } = prisma.quranVerse.findMany.mock.calls[0][0] as any;
    // Juz 30 spans 37 surahs; the clause must still be three branches.
    expect(where.OR).toHaveLength(3);

    await service.getJuz(2, { page: 1, limit: 50 });
    const single = prisma.quranVerse.findMany.mock.calls[1][0] as any;
    // A juz inside one surah collapses to a single clause.
    expect(single.where.OR).toBeUndefined();
    expect(single.where).toEqual({
      surahId: 2,
      verseNumber: { gte: 142, lte: 252 },
    });
  });
});
