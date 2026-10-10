import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';
import {
  JUZ_BOUNDARIES,
  JUZ_MAX,
  JUZ_MIN,
  JuzBoundary,
  getJuzBoundary,
  surahIdsForJuz,
} from '../juz-boundaries';

/**
 * Juz reading — `GET /juz` and `GET /juz/:number`.
 *
 * Frozen contract: `docs/contracts/quran-juz-api.md`. Section references below
 * are to that document; where the code and the contract disagree, the contract
 * is right and the code is a bug.
 *
 * ## The shape of the problem
 *
 * A juz is a *range*, not a set of surahs. Juz 30 spans 37 of them. The whole
 * reason this is a server endpoint (§"Why this is a backend endpoint") is that
 * a client assembling it from `GET /surah/:id` would make 37 round trips — so
 * an implementation that makes 37 queries on the server has moved the problem
 * rather than solved it. This service therefore issues a *fixed* number of
 * statements for any juz: there is no loop with an `await` in it anywhere
 * below, and the span of the juz never appears in the query count.
 *
 * The range predicate is three fixed `OR` branches (head / whole middle
 * surahs / tail) — not one branch per surah — and `(surah_id, verse_number)`
 * is the `@@unique` index on `quran_verses`, so the database walks it.
 */

const CACHE_TTL_WEEK = 7 * 24 * 60 * 60 * 1000;
const SURAH_INDEX_CACHE_KEY = 'quran:juz:surah-index:v1';

/**
 * The app default translation. Same edition `getSurahPremium` falls back to
 * for a non-premium caller, and the only one `prisma/seed-quran-premium.ts`
 * marks `isPremium = false`.
 */
const DEFAULT_TRANSLATION_LANGUAGE = 'en';
const DEFAULT_TRANSLATION_AUTHOR = 'Saheeh International';

/** One row of the cached surah index. Plain JSON — it round-trips Redis. */
interface SurahIndexRow {
  id: number;
  name: string;
  verseCount: number;
}

@Injectable()
export class JuzService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Surah display names and verse counts, for all 114, in one shot.
   *
   * Two statements on a cold cache, zero on a warm one, and the *same* two
   * whichever juz is asked for — this is what keeps both endpoints flat.
   *
   * Verse counts come from `quran_verses` itself via `groupBy`, not from the
   * denormalised `quran_surahs.verse_count` column and emphatically not from
   * anything stored beside the boundaries: §"Correctness gate" requires the
   * counts to be computed from the seeded rows, so that the totals assertion
   * is comparing two independent things.
   */
  private async getSurahIndex(): Promise<Map<number, SurahIndexRow>> {
    const cached = await this.cacheManager.get<SurahIndexRow[]>(
      SURAH_INDEX_CACHE_KEY,
    );
    if (cached) return new Map(cached.map((row) => [row.id, row]));

    // Statement 1 — names. `nameTransliteration` is the field that yields the
    // contract's literal "Al-Fatihah" / "Al-Baqarah"; `nameEnglish` holds the
    // *meaning* ("The Opening"), which is not what §1's example shows.
    const surahs = await this.prisma.quranSurah.findMany({
      select: { id: true, nameTransliteration: true },
      orderBy: { id: 'asc' },
    });

    // Statement 2 — counts, aggregated in the database. 114 rows back,
    // regardless of the 6,236 it aggregates over.
    const grouped = await this.prisma.quranVerse.groupBy({
      by: ['surahId'],
      _count: { _all: true },
    });
    const counts = new Map<number, number>(
      grouped.map((g) => [g.surahId, g._count._all]),
    );

    const rows: SurahIndexRow[] = surahs.map((s) => ({
      id: s.id,
      name: s.nameTransliteration,
      verseCount: counts.get(s.id) ?? 0,
    }));

    await this.cacheManager.set(SURAH_INDEX_CACHE_KEY, rows, CACHE_TTL_WEEK);
    return new Map(rows.map((row) => [row.id, row]));
  }

  /**
   * A juz's verse count, walked over the surah index. Partial at both ends,
   * whole in between. In-memory arithmetic over an already-fetched map — the
   * loop issues no queries.
   */
  private verseCountOf(
    juz: JuzBoundary,
    index: Map<number, SurahIndexRow>,
  ): number {
    let total = 0;
    for (const surahId of surahIdsForJuz(juz)) {
      const from = surahId === juz.start.surahId ? juz.start.verseNumber : 1;
      const to =
        surahId === juz.end.surahId
          ? juz.end.verseNumber
          : (index.get(surahId)?.verseCount ?? 0);
      total += Math.max(0, to - from + 1);
    }
    return total;
  }

  /**
   * §1 — the chooser. All 30, ascending, with the names and the span the
   * client needs to render "Al-Fatihah – Al-Baqarah" without a second call.
   *
   * Statements: 2 cold, 0 warm. Not 30, and not 30 × span.
   */
  async getJuzIndex() {
    const index = await this.getSurahIndex();

    return JUZ_BOUNDARIES.map((juz) => ({
      number: juz.number,
      start: {
        surahId: juz.start.surahId,
        surahName: index.get(juz.start.surahId)?.name ?? null,
        verseNumber: juz.start.verseNumber,
      },
      end: {
        surahId: juz.end.surahId,
        surahName: index.get(juz.end.surahId)?.name ?? null,
        verseNumber: juz.end.verseNumber,
      },
      verseCount: this.verseCountOf(juz, index),
      surahIds: surahIdsForJuz(juz),
    }));
  }

  /**
   * §2 — the reader. One page of verses from one juz, in canonical order.
   *
   * Statements: 3 cold (2 for the surah index, 1 for the page) and 1 warm,
   * plus one more that Prisma emits for the `translations` include — so 4 cold
   * / 2 warm of actual SQL. Constant in the number of surahs the juz spans.
   */
  async getJuz(
    number: number,
    options: { translationId?: string; page: number; limit: number },
  ) {
    const juz = this.requireJuz(number);
    const { page, limit } = options;

    const index = await this.getSurahIndex();
    const verseCount = this.verseCountOf(juz, index);
    const totalPages = Math.max(1, Math.ceil(verseCount / limit));
    const skip = (page - 1) * limit;

    // One page of the range. `orderBy` is canonical muṣḥaf order, which is
    // what makes `skip`/`take` a meaningful page *and* what makes
    // `indexInJuz` below simple arithmetic rather than a second pass.
    const verses = await this.prisma.quranVerse.findMany({
      where: this.rangeWhere(juz),
      orderBy: [{ surahId: 'asc' }, { verseNumber: 'asc' }],
      skip,
      take: limit,
      select: {
        id: true,
        surahId: true,
        verseNumber: true,
        textArabic: true,
        textUthmani: true,
        // Additive per `docs/contracts/quran-juz-api.md` §3. Nullable in the
        // table, so it is mapped to an explicit `null` below rather than
        // being allowed to come back `undefined` and vanish from the JSON.
        textIndopak: true,
        translations: {
          where: this.translationWhere(options.translationId),
          select: { text: true },
          take: 1,
        },
      },
    });

    return {
      number: juz.number,
      verseCount,
      page,
      limit,
      totalPages,
      verses: verses.map((verse, i) => ({
        id: verse.id,
        surahId: verse.surahId,
        surahName: index.get(verse.surahId)?.name ?? null,
        verseNumber: verse.verseNumber,
        // §2 — 1-based across the *whole* juz, not the page. The reader needs
        // it to say "105 verses left" independently of position in surah.
        indexInJuz: skip + i + 1,
        textArabic: verse.textArabic,
        textUthmani: verse.textUthmani ?? null,
        textIndopak: verse.textIndopak ?? null,
        translation: verse.translations[0]?.text ?? null,
      })),
    };
  }

  /**
   * §2 — "anything else is a `400`, not a `404` — the resource class is valid,
   * the value isn't".
   */
  private requireJuz(number: number): JuzBoundary {
    const juz = Number.isInteger(number) ? getJuzBoundary(number) : undefined;
    if (!juz) {
      throw new BadRequestException(
        `Juz number must be an integer between ${JUZ_MIN} and ${JUZ_MAX}`,
      );
    }
    return juz;
  }

  /**
   * The juz as a `(surah, verse)` range predicate.
   *
   * Three branches, always — head of the first surah, every surah strictly
   * between, tail of the last — collapsing to one when the juz sits inside a
   * single surah. This is the line that the performance constraint is about:
   * one `OR` branch per spanned surah would be 37 branches for juz 30, and a
   * query per surah would be 37 round trips.
   */
  private rangeWhere(juz: JuzBoundary) {
    const { start, end } = juz;

    if (start.surahId === end.surahId) {
      return {
        surahId: start.surahId,
        verseNumber: { gte: start.verseNumber, lte: end.verseNumber },
      };
    }

    return {
      OR: [
        { surahId: start.surahId, verseNumber: { gte: start.verseNumber } },
        { surahId: { gt: start.surahId, lt: end.surahId } },
        { surahId: end.surahId, verseNumber: { lte: end.verseNumber } },
      ],
    };
  }

  /**
   * Which translation to attach.
   *
   * `isPremium: false` is not decoration. Both juz endpoints are `@Public()`
   * per §2, and `quran_translations` holds four paid editions alongside the
   * free one; without this filter a `?translationId=Yusuf%20Ali` would hand
   * premium content to an unauthenticated caller, which the equivalent
   * `GET /surah/:id/premium` route guards with `@Roles('premium_user')`. A
   * premium edition therefore resolves to `translation: null` here rather than
   * being served — the contract says nothing about premium, and silently
   * giving it away is the one reading that is certainly wrong.
   */
  private translationWhere(translationId?: string) {
    if (translationId) {
      return { authorName: translationId, isPremium: false };
    }
    return {
      language: DEFAULT_TRANSLATION_LANGUAGE,
      authorName: DEFAULT_TRANSLATION_AUTHOR,
      isPremium: false,
    };
  }
}
