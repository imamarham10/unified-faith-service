import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/utils/prisma.service';
import {
  FaithId,
  RefType,
  SERVABLE_REVIEW_STATUSES,
} from '../collection-vocabulary';

type ScriptType = 'simple' | 'uthmani' | 'indopak';

const VALID_SCRIPTS: ScriptType[] = ['simple', 'uthmani', 'indopak'];
export const toScript = (raw?: string): ScriptType =>
  VALID_SCRIPTS.includes(raw as ScriptType) ? (raw as ScriptType) : 'simple';

/**
 * Curated collections — read path.
 *
 * ## Why this service is shared rather than duplicated per faith
 *
 * `Collection` carries a `faithId` discriminator and both verticals use the
 * same `CollectionItem` table, so there is exactly one item resolver. The two
 * controllers (`/api/v1/islam/collections`, `/api/v1/hindu/collections`) are
 * thin: each pins `faithId` and forwards. Writing the resolver twice would
 * guarantee the two halves drift, and the Hindu half would be the one that
 * rots — Hindu collections are Phase 5 content.
 *
 * ## Statement budget — the load-bearing property
 *
 * This codebase has a documented history of per-item `await` loops costing
 * hundreds of round trips; one endpoint once made ~286 sequential calls. So
 * the number of queries here is **a function of which refTypes appear in a
 * collection, never of how many items it has.**
 *
 *   GET /collections          1 query, + 1 for the item counts  = **1–2**
 *   GET /collections/:slug    1 collection + 1 items
 *                             + at most 8 batch resolvers, one per refType
 *                               *family present*                = **2–10**
 *
 *   nightly-recitation (surah + ayah_range)  -> 4
 *   gita-daily         (hindu_verse_range)   -> 5
 *
 * Those are Prisma client calls. Each `include:` of a relation adds one more
 * SQL statement at the engine level (translations, stotra verses) — also a
 * fixed count, also independent of item count. `collections.service.spec.ts`
 * asserts a 60-item collection costs exactly the same number of calls as a
 * 6-item one, which is the property that actually matters.
 *
 * Deliberately **not** cached. `QuranService` wraps its reads in
 * `cacheManager`, but a cache in front of this would make the statement count
 * nondeterministic and therefore untestable, and collections are a handful of
 * small rows. Add caching behind a measurement, not ahead of one.
 */
@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * `draft` never leaves Postgres (spec §5.1, release gate §8). This is a
   * query predicate, not a post-filter, so there is no code path on which an
   * unreviewed collection is serialised.
   */
  private servableWhere(faithId: FaithId) {
    return {
      faithId,
      isActive: true,
      reviewStatus: { in: SERVABLE_REVIEW_STATUSES },
    };
  }

  // -------------------------------------------------------------------------
  // GET /api/v1/{faith}/collections
  // -------------------------------------------------------------------------

  async getCollections(faithId: FaithId) {
    // [1] the collections themselves
    const collections = await this.prisma.collection.findMany({
      where: this.servableWhere(faithId),
      orderBy: [
        { sortOrder: 'asc' },
        { priority: 'desc' },
        { slug: 'asc' },
      ],
    });

    if (collections.length === 0) return [];

    // [2] item counts for all of them at once. `groupBy` rather than
    // `include: { _count }` so the statement count is one, visibly, instead of
    // depending on how the query engine chooses to compile a relation count.
    const counts = await this.prisma.collectionItem.groupBy({
      by: ['collectionId'],
      where: { collectionId: { in: collections.map((c) => c.id) } },
      _count: { _all: true },
    });
    const countBy = new Map<string, number>(
      counts.map((row: any) => [row.collectionId, row._count._all]),
    );

    return collections.map((c) => ({
      ...this.summary(c),
      itemCount: countBy.get(c.id) ?? 0,
    }));
  }

  // -------------------------------------------------------------------------
  // GET /api/v1/{faith}/collections/:slug
  // -------------------------------------------------------------------------

  async getCollectionBySlug(
    faithId: FaithId,
    slug: string,
    lang = 'en',
    script: ScriptType = 'simple',
  ) {
    // [1] the collection
    const collection = await this.prisma.collection.findFirst({
      where: { ...this.servableWhere(faithId), slug },
    });
    if (!collection) {
      throw new NotFoundException(
        `Collection '${slug}' not found for faith '${faithId}'`,
      );
    }

    // [2] its items, in sequence. Order is semantic (spec §1.1) — this
    // orderBy is not cosmetic and must never become a client-side sort.
    const items = await this.prisma.collectionItem.findMany({
      where: { collectionId: collection.id },
      orderBy: { sequence: 'asc' },
    });

    const resolved = await this.resolveItems(items, lang, script);

    return {
      ...this.summary(collection),
      itemCount: items.length,
      items: items.map((item) => this.serialiseItem(item, resolved)),
    };
  }

  // -------------------------------------------------------------------------
  // Serialisation
  // -------------------------------------------------------------------------

  private summary(c: any) {
    return {
      slug: c.slug,
      faithId: c.faithId,
      title: c.title,
      subtitle: c.subtitle,
      description: c.description,
      occasionType: c.occasionType,
      occasionConfig: c.occasionConfig,
      orderSemantics: c.orderSemantics,
      artworkKey: c.artworkKey,
      estimatedMinutes: c.estimatedMinutes,
      priority: c.priority,
      sortOrder: c.sortOrder,
      // Spec §5.4: provenance is user-visible through one "About this
      // collection" affordance, so it ships on the resource rather than
      // behind a second request.
      provenance: {
        provenanceClass: c.provenanceClass,
        reviewStatus: c.reviewStatus,
        curatedBy: c.curatedBy,
        curatedAt: c.curatedAt,
        reviewedBy: c.reviewedBy,
        reviewedAt: c.reviewedAt,
      },
    };
  }

  private serialiseItem(item: any, r: ResolvedBatches) {
    const content = this.contentFor(item, r);
    return {
      sequence: item.sequence,
      refType: item.refType,
      repeatCount: item.repeatCount,
      label: item.label,
      note: item.note,
      citation: item.citation,
      grading: item.grading,
      translationSource: item.translationSource,
      isOptional: item.isOptional,
      ref: {
        surahId: item.surahId,
        ayahStart: item.ayahStart,
        ayahEnd: item.ayahEnd,
        hinduTextSlug: item.hinduTextSlug,
        chapterNumber: item.chapterNumber,
        verseStart: item.verseStart,
        verseEnd: item.verseEnd,
        refSlug: item.refSlug,
        refId: item.refId,
      },
      content: content.content,
      // Never silently render an empty item. An unresolved ref is a data
      // problem the client should be able to surface, and the verifier is
      // what stops one reaching production in the first place.
      unresolved: content.unresolved,
    };
  }

  // -------------------------------------------------------------------------
  // Batch resolution — one query per refType family present, zero per item
  // -------------------------------------------------------------------------

  private async resolveItems(
    items: any[],
    lang: string,
    script: ScriptType,
  ): Promise<ResolvedBatches> {
    const byType = new Map<RefType, any[]>();
    for (const item of items) {
      const list = byType.get(item.refType) ?? [];
      list.push(item);
      byType.set(item.refType, list);
    }

    const out: ResolvedBatches = {
      surahs: new Map(),
      versesBySurah: new Map(),
      duasBySlug: new Map(),
      duasById: new Map(),
      allahNamesById: new Map(),
      hadithsByRef: new Map(),
      hinduTextsBySlug: new Map(),
      hinduChapters: new Map(),
      hinduVersesByChapter: new Map(),
      stotrasBySlug: new Map(),
      script,
    };

    const quranItems = [
      ...(byType.get('surah') ?? []),
      ...(byType.get('ayah_range') ?? []),
    ];
    const hinduItems = byType.get('hindu_verse_range') ?? [];

    // Independent families — run them concurrently. Each helper is itself a
    // fixed number of queries; Promise.all only removes latency, it does not
    // change the count.
    await Promise.all([
      quranItems.length ? this.loadQuran(quranItems, lang, script, out) : null,
      byType.get('dua')?.length ? this.loadDuas(byType.get('dua'), out) : null,
      byType.get('allah_name')?.length
        ? this.loadAllahNames(byType.get('allah_name'), out)
        : null,
      byType.get('hadith')?.length
        ? this.loadHadiths(byType.get('hadith'), out)
        : null,
      hinduItems.length ? this.loadHinduVerses(hinduItems, lang, out) : null,
      byType.get('stotra')?.length
        ? this.loadStotras(byType.get('stotra'), lang, out)
        : null,
    ]);

    return out;
  }

  /** 2 queries: surah metadata, then every needed verse in one OR'd read. */
  private async loadQuran(
    items: any[],
    lang: string,
    script: ScriptType,
    out: ResolvedBatches,
  ) {
    const surahIds = [
      ...new Set(items.map((i) => i.surahId).filter((n) => Number.isInteger(n))),
    ];
    if (!surahIds.length) return;

    const predicates = items
      .filter((i) => Number.isInteger(i.surahId))
      .map((i) =>
        i.ayahStart == null
          ? { surahId: i.surahId } // whole surah
          : {
              surahId: i.surahId,
              verseNumber: { gte: i.ayahStart, lte: i.ayahEnd ?? i.ayahStart },
            },
      );

    const [surahs, verses] = await Promise.all([
      this.prisma.quranSurah.findMany({ where: { id: { in: surahIds } } }),
      this.prisma.quranVerse.findMany({
        where: { OR: predicates },
        orderBy: [{ surahId: 'asc' }, { verseNumber: 'asc' }],
        include: {
          translations: {
            where: { language: lang },
            select: { authorName: true, language: true, text: true },
          },
        },
      }),
    ]);

    for (const s of surahs) out.surahs.set(s.id, s);
    for (const v of verses) {
      const list = out.versesBySurah.get(v.surahId) ?? [];
      list.push(v);
      out.versesBySurah.set(v.surahId, list);
    }
  }

  /** 1 query. Slug-first; `refId` is the documented uuid fallback. */
  private async loadDuas(items: any[], out: ResolvedBatches) {
    const slugs = [...new Set(items.map((i) => i.refSlug).filter(Boolean))];
    const ids = [...new Set(items.map((i) => i.refId).filter(Boolean))];
    const or: any[] = [];
    if (slugs.length) or.push({ slug: { in: slugs } });
    if (ids.length) or.push({ id: { in: ids } });
    if (!or.length) return;

    const duas = await this.prisma.dua.findMany({
      where: { OR: or },
      include: { category: { select: { name: true } } },
    });
    for (const d of duas) {
      if (d.slug) out.duasBySlug.set(d.slug, d);
      out.duasById.set(d.id, d);
    }
  }

  /** 1 query. `AllahName.id` is an Int 1..99, carried in `refId` as text. */
  private async loadAllahNames(items: any[], out: ResolvedBatches) {
    const ids = [
      ...new Set(
        items
          .map((i) => Number.parseInt(i.refId ?? i.refSlug ?? '', 10))
          .filter((n) => Number.isInteger(n)),
      ),
    ];
    if (!ids.length) return;
    const names = await this.prisma.allahName.findMany({
      where: { id: { in: ids } },
    });
    for (const n of names) out.allahNamesById.set(n.id, n);
  }

  /**
   * 2 queries. `refSlug` is `<book>:<number>` ("bukhari:2311"); the book half
   * is matched case-insensitively against `HadithBook.name`, which is the only
   * stable key that table has — it carries no slug of its own. No hadith item
   * is seeded in Phase 2; this path exists so the refType is not a lie.
   */
  private async loadHadiths(items: any[], out: ResolvedBatches) {
    const refs = items
      .map((i) => String(i.refSlug ?? ''))
      .filter((s) => s.includes(':'))
      .map((s) => {
        const [book, num] = s.split(':');
        return { raw: s, book: book.trim(), number: Number.parseInt(num, 10) };
      })
      .filter((r) => r.book && Number.isInteger(r.number));
    if (!refs.length) return;

    const books = await this.prisma.hadithBook.findMany({
      select: { id: true, name: true, nameArabic: true },
    });
    const bookFor = (needle: string) =>
      books.find((b) =>
        b.name.toLowerCase().includes(needle.toLowerCase()),
      );

    const or = refs
      .map((r) => ({ r, book: bookFor(r.book) }))
      .filter((x) => x.book)
      .map((x) => ({ bookId: x.book!.id, hadithNumber: x.r.number }));
    if (!or.length) return;

    const hadiths = await this.prisma.hadith.findMany({
      where: { OR: or },
      include: { book: { select: { name: true, nameArabic: true } } },
    });
    for (const r of refs) {
      const book = bookFor(r.book);
      if (!book) continue;
      const hit = hadiths.find(
        (h) => h.bookId === book.id && h.hadithNumber === r.number,
      );
      if (hit) out.hadithsByRef.set(r.raw, hit);
    }
  }

  /**
   * 3 queries: texts by slug, the named chapters, then every needed verse in
   * one OR'd read. The chapter hop is what makes `hinduTextSlug +
   * chapterNumber + verseStart` single-valued — it goes through
   * `HinduTextChapter.@@unique([textId, chapterNumber])`.
   */
  private async loadHinduVerses(
    items: any[],
    lang: string,
    out: ResolvedBatches,
  ) {
    const slugs = [
      ...new Set(items.map((i) => i.hinduTextSlug).filter(Boolean)),
    ];
    if (!slugs.length) return;

    const texts = await this.prisma.hinduText.findMany({
      where: { slug: { in: slugs } },
      select: {
        id: true,
        slug: true,
        nameEnglish: true,
        nameSanskrit: true,
        type: true,
      },
    });
    for (const t of texts) out.hinduTextsBySlug.set(t.slug, t);
    const textIdBySlug = new Map(texts.map((t) => [t.slug, t.id]));

    const chapterKeys = items
      .map((i) => ({
        textId: textIdBySlug.get(i.hinduTextSlug),
        chapterNumber: i.chapterNumber,
      }))
      .filter((k) => k.textId && Number.isInteger(k.chapterNumber));
    if (!chapterKeys.length) return;

    const chapters = await this.prisma.hinduTextChapter.findMany({
      where: { OR: chapterKeys },
      select: {
        id: true,
        textId: true,
        chapterNumber: true,
        nameEnglish: true,
        nameSanskrit: true,
      },
    });
    const chapterIdFor = new Map<string, any>();
    for (const c of chapters) {
      const slug = texts.find((t) => t.id === c.textId)?.slug;
      if (slug) {
        out.hinduChapters.set(`${slug}:${c.chapterNumber}`, c);
        chapterIdFor.set(`${slug}:${c.chapterNumber}`, c);
      }
    }

    const versePredicates = items
      .map((i) => {
        const chapter = chapterIdFor.get(
          `${i.hinduTextSlug}:${i.chapterNumber}`,
        );
        if (!chapter) return null;
        const start = i.verseStart;
        return {
          chapterId: chapter.id,
          verseNumber:
            start == null
              ? undefined
              : { gte: start, lte: i.verseEnd ?? start },
        };
      })
      .filter(Boolean)
      .map((p: any) =>
        p.verseNumber === undefined ? { chapterId: p.chapterId } : p,
      );
    if (!versePredicates.length) return;

    const verses = await this.prisma.hinduTextVerse.findMany({
      where: { OR: versePredicates },
      orderBy: { verseNumber: 'asc' },
      include: {
        translations: {
          where: { languageCode: lang },
          select: { languageCode: true, authorName: true, text: true },
        },
      },
    });
    for (const v of verses) {
      const key = v.chapterId ?? 'null';
      const list = out.hinduVersesByChapter.get(key) ?? [];
      list.push(v);
      out.hinduVersesByChapter.set(key, list);
    }
  }

  /** 1 query (plus the engine's nested include statements). */
  private async loadStotras(items: any[], lang: string, out: ResolvedBatches) {
    const slugs = [...new Set(items.map((i) => i.refSlug).filter(Boolean))];
    if (!slugs.length) return;
    const stotras = await this.prisma.stotra.findMany({
      where: { slug: { in: slugs } },
      include: {
        verses: {
          orderBy: { verseNumber: 'asc' },
          include: {
            translations: {
              where: { languageCode: lang },
              select: { languageCode: true, text: true },
            },
          },
        },
      },
    });
    for (const s of stotras) out.stotrasBySlug.set(s.slug, s);
  }

  // -------------------------------------------------------------------------
  // Per-item content projection — pure, no I/O
  // -------------------------------------------------------------------------

  private contentFor(
    item: any,
    r: ResolvedBatches,
  ): { content: any; unresolved: { reason: string } | null } {
    const missing = (reason: string) => ({ content: null, unresolved: { reason } });

    switch (item.refType as RefType) {
      case 'surah':
      case 'ayah_range': {
        const surah = r.surahs.get(item.surahId);
        if (!surah) return missing(`surah ${item.surahId} not seeded`);
        const all = r.versesBySurah.get(item.surahId) ?? [];
        const from = item.ayahStart ?? 1;
        const to = item.ayahEnd ?? (item.ayahStart ?? surah.verseCount);
        const verses = all
          .filter((v) =>
            item.ayahStart == null
              ? true
              : v.verseNumber >= from && v.verseNumber <= to,
          )
          .map((v) => this.projectVerse(v, r.script));
        if (!verses.length) {
          return missing(
            `no verses found for ${item.surahId}:${item.ayahStart ?? 'all'}`,
          );
        }
        return {
          content: {
            kind: item.refType,
            surah: {
              id: surah.id,
              nameArabic: surah.nameArabic,
              nameEnglish: surah.nameEnglish,
              nameTransliteration: surah.nameTransliteration,
              revelationPlace: surah.revelationPlace,
              verseCount: surah.verseCount,
            },
            verses,
          },
          unresolved: null,
        };
      }

      case 'dua': {
        const dua =
          (item.refSlug && r.duasBySlug.get(item.refSlug)) ||
          (item.refId && r.duasById.get(item.refId));
        if (!dua) {
          return missing(
            `dua '${item.refSlug ?? item.refId}' not found — has seed-duas-complete.ts back-filled Dua.slug?`,
          );
        }
        return {
          content: {
            kind: 'dua',
            dua: {
              slug: dua.slug,
              titleArabic: dua.titleArabic,
              titleEnglish: dua.titleEnglish,
              textArabic: dua.textArabic,
              textTransliteration: dua.textTranslit,
              textEnglish: dua.textEnglish,
              reference: dua.reference,
              audioUrl: dua.audioUrl,
              category: dua.category?.name ?? null,
            },
          },
          unresolved: null,
        };
      }

      case 'allah_name': {
        const id = Number.parseInt(item.refId ?? item.refSlug ?? '', 10);
        const name = r.allahNamesById.get(id);
        if (!name) return missing(`allah name '${item.refId}' not found`);
        return { content: { kind: 'allah_name', name }, unresolved: null };
      }

      case 'hadith': {
        const hadith = r.hadithsByRef.get(String(item.refSlug));
        if (!hadith) return missing(`hadith '${item.refSlug}' not found`);
        return {
          content: {
            kind: 'hadith',
            hadith: {
              book: hadith.book?.name ?? null,
              hadithNumber: hadith.hadithNumber,
              textArabic: hadith.textArabic,
              textEnglish: hadith.textEnglish,
              narratorChain: hadith.narratorChain,
              grade: hadith.grade,
              reference: hadith.reference,
            },
          },
          unresolved: null,
        };
      }

      case 'hindu_verse_range': {
        const text = r.hinduTextsBySlug.get(item.hinduTextSlug);
        if (!text) return missing(`hindu text '${item.hinduTextSlug}' not seeded`);
        const chapter = r.hinduChapters.get(
          `${item.hinduTextSlug}:${item.chapterNumber}`,
        );
        if (!chapter) {
          return missing(
            `${item.hinduTextSlug} chapter ${item.chapterNumber} not seeded`,
          );
        }
        const from = item.verseStart ?? 1;
        const to = item.verseEnd ?? item.verseStart ?? Number.MAX_SAFE_INTEGER;
        const verses = (r.hinduVersesByChapter.get(chapter.id) ?? [])
          .filter((v) => v.verseNumber >= from && v.verseNumber <= to)
          .map((v) => ({
            verseNumber: v.verseNumber,
            sanskritText: v.sanskritText,
            transliteration: v.transliteration,
            translations: v.translations,
          }));
        if (!verses.length) {
          return missing(
            `${item.hinduTextSlug} ${item.chapterNumber}:${from}-${to} has no seeded verses`,
          );
        }
        return {
          content: {
            kind: 'hindu_verse_range',
            text: {
              slug: text.slug,
              nameEnglish: text.nameEnglish,
              nameSanskrit: text.nameSanskrit,
            },
            chapter: {
              chapterNumber: chapter.chapterNumber,
              nameEnglish: chapter.nameEnglish,
              nameSanskrit: chapter.nameSanskrit,
            },
            verses,
          },
          unresolved: null,
        };
      }

      case 'stotra': {
        const stotra = r.stotrasBySlug.get(item.refSlug);
        if (!stotra) return missing(`stotra '${item.refSlug}' not seeded`);
        return {
          content: {
            kind: 'stotra',
            stotra: {
              slug: stotra.slug,
              titleSanskrit: stotra.titleSanskrit,
              titleEnglish: stotra.titleEnglish,
              type: stotra.type,
              deityKey: stotra.deityKey,
              verses: (stotra.verses ?? []).map((v: any) => ({
                verseNumber: v.verseNumber,
                sanskritText: v.sanskritText,
                transliteration: v.transliteration,
                translations: v.translations,
              })),
            },
          },
          unresolved: null,
        };
      }

      // `dhikr`, `mantra` and `text` have no content table in this schema —
      // DhikrDictionaryService is in-memory and there is no mantra model. The
      // item's own label/citation/repeatCount are still serialised above; the
      // client renders those and the reason says why there is no body. No
      // Phase 2 collection uses these refTypes.
      default:
        return missing(
          `refType '${item.refType}' has no content table in this schema yet`,
        );
    }
  }

  /**
   * Mirrors `QuranService.mapVerseScript` — `?script=` selects which Unicode
   * string `textArabic` carries, with the same deliberate fallback chain
   * (`text_indopak` is nullable until `seed-quran-scripts.ts` has run).
   */
  private projectVerse(verse: any, script: ScriptType) {
    const arabic =
      script === 'indopak'
        ? verse.textIndopak || verse.textUthmani || verse.textArabic
        : script === 'uthmani'
          ? verse.textUthmani || verse.textArabic
          : verse.textArabic;
    return {
      surahId: verse.surahId,
      verseNumber: verse.verseNumber,
      textArabic: arabic,
      textIndopak: verse.textIndopak ?? null,
      translations: verse.translations ?? [],
      // Byte-identical to `quranVerseRef()` in the client (spec §0.5, §4.2).
      // The collection reader mints activity events from this, and a
      // `collection:` prefix here would make the same verse count twice.
      sourceRef: `quran:${verse.surahId}:${verse.verseNumber}`,
    };
  }
}

interface ResolvedBatches {
  surahs: Map<number, any>;
  versesBySurah: Map<number, any[]>;
  duasBySlug: Map<string, any>;
  duasById: Map<string, any>;
  allahNamesById: Map<number, any>;
  hadithsByRef: Map<string, any>;
  hinduTextsBySlug: Map<string, any>;
  hinduChapters: Map<string, any>;
  hinduVersesByChapter: Map<string, any[]>;
  stotrasBySlug: Map<string, any>;
  script: ScriptType;
}
