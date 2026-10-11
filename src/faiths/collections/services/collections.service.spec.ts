import { NotFoundException } from '@nestjs/common';
import { CollectionsService } from './collections.service';

/**
 * `CollectionsService` — the property under test is the **statement budget**.
 *
 * This codebase has a documented history of per-item `await` loops costing
 * hundreds of round trips; one endpoint once made ~286 sequential calls. The
 * claim in the service doc comment ("independent of item count") is only worth
 * anything if something checks it, so the central assertion here is that a
 * **60-item** collection costs exactly the same number of Prisma calls as a
 * **6-item** one.
 *
 * No database: `PrismaService` is replaced by a recording fake. Nothing in
 * this file opens a connection, reads `.env`, or needs a seeded corpus —
 * matching `juz.controller.spec.ts`, which established the pattern.
 */

type Call = { model: string; op: string; args: any };

/**
 * A minimal recording stand-in for PrismaService. Every delegate call is
 * logged, so `calls.length` IS the statement count at the client level.
 */
function makePrisma(data: {
  collections?: any[];
  items?: any[];
  surahs?: any[];
  verses?: any[];
  duas?: any[];
  allahNames?: any[];
  hadithBooks?: any[];
  hadiths?: any[];
  hinduTexts?: any[];
  hinduChapters?: any[];
  hinduVerses?: any[];
  stotras?: any[];
}) {
  const calls: Call[] = [];
  const record = (model: string, op: string) => (args: any) => {
    calls.push({ model, op, args });
    switch (`${model}.${op}`) {
      case 'collection.findMany':
        return Promise.resolve(data.collections ?? []);
      case 'collection.findFirst':
        return Promise.resolve((data.collections ?? [])[0] ?? null);
      case 'collectionItem.findMany':
        return Promise.resolve(data.items ?? []);
      case 'collectionItem.groupBy':
        return Promise.resolve(
          (data.collections ?? []).map((c) => ({
            collectionId: c.id,
            _count: { _all: (data.items ?? []).length },
          })),
        );
      case 'quranSurah.findMany':
        return Promise.resolve(data.surahs ?? []);
      case 'quranVerse.findMany':
        return Promise.resolve(data.verses ?? []);
      case 'dua.findMany':
        return Promise.resolve(data.duas ?? []);
      case 'allahName.findMany':
        return Promise.resolve(data.allahNames ?? []);
      case 'hadithBook.findMany':
        return Promise.resolve(data.hadithBooks ?? []);
      case 'hadith.findMany':
        return Promise.resolve(data.hadiths ?? []);
      case 'hinduText.findMany':
        return Promise.resolve(data.hinduTexts ?? []);
      case 'hinduTextChapter.findMany':
        return Promise.resolve(data.hinduChapters ?? []);
      case 'hinduTextVerse.findMany':
        return Promise.resolve(data.hinduVerses ?? []);
      case 'stotra.findMany':
        return Promise.resolve(data.stotras ?? []);
      default:
        return Promise.resolve([]);
    }
  };

  const prisma: any = {
    collection: {
      findMany: record('collection', 'findMany'),
      findFirst: record('collection', 'findFirst'),
    },
    collectionItem: {
      findMany: record('collectionItem', 'findMany'),
      groupBy: record('collectionItem', 'groupBy'),
    },
    quranSurah: { findMany: record('quranSurah', 'findMany') },
    quranVerse: { findMany: record('quranVerse', 'findMany') },
    dua: { findMany: record('dua', 'findMany') },
    allahName: { findMany: record('allahName', 'findMany') },
    hadithBook: { findMany: record('hadithBook', 'findMany') },
    hadith: { findMany: record('hadith', 'findMany') },
    hinduText: { findMany: record('hinduText', 'findMany') },
    hinduTextChapter: { findMany: record('hinduTextChapter', 'findMany') },
    hinduTextVerse: { findMany: record('hinduTextVerse', 'findMany') },
    stotra: { findMany: record('stotra', 'findMany') },
  };
  return { prisma, calls };
}

const COLLECTION = {
  id: 'c1',
  slug: 'nightly-recitation',
  faithId: 'islam',
  title: 'Nightly Recitation',
  subtitle: 'Before sleep',
  description: null,
  occasionType: 'nightly',
  occasionConfig: { clock: { from: '20:00', to: '03:59' } },
  orderSemantics: 'sequence',
  provenanceClass: 'transmitted',
  reviewStatus: 'self_reviewed',
  curatedBy: 'spec §2',
  curatedAt: new Date('2026-10-11'),
  reviewedBy: null,
  reviewedAt: null,
  artworkKey: null,
  estimatedMinutes: 6,
  priority: 10,
  sortOrder: 10,
  isActive: true,
};

const baseItem = (over: any = {}) => ({
  id: `i${over.sequence ?? 1}`,
  collectionId: 'c1',
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
  translationSource: null,
  isOptional: false,
  ...over,
});

const surah = (id: number, verseCount: number) => ({
  id,
  nameArabic: 'x',
  nameEnglish: `S${id}`,
  nameTransliteration: `S${id}`,
  revelationPlace: 'meccan',
  verseCount,
});

const verse = (surahId: number, verseNumber: number) => ({
  id: `${surahId}:${verseNumber}`,
  surahId,
  verseNumber,
  textArabic: 'ع',
  textSimple: 'a',
  textUthmani: 'u',
  textIndopak: null,
  translations: [{ authorName: 'Saheeh International', language: 'en', text: 't' }],
});

describe('CollectionsService — statement budget', () => {
  it('GET /collections issues exactly 2 statements, whatever the item counts', async () => {
    const { prisma, calls } = makePrisma({
      collections: [COLLECTION, { ...COLLECTION, id: 'c2', slug: 'other' }],
      items: Array.from({ length: 60 }, (_, n) => baseItem({ sequence: n + 1 })),
    });
    const service = new CollectionsService(prisma);

    const result = await service.getCollections('islam');

    expect(calls.map((c) => `${c.model}.${c.op}`)).toEqual([
      'collection.findMany',
      'collectionItem.groupBy',
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].itemCount).toBe(60);
  });

  it('GET /collections issues 1 statement when there are no collections', async () => {
    const { prisma, calls } = makePrisma({ collections: [] });
    const service = new CollectionsService(prisma);

    await expect(service.getCollections('islam')).resolves.toEqual([]);
    expect(calls).toHaveLength(1);
  });

  /**
   * THE test. Six items and sixty items, same refTypes, same call count.
   * If anyone reintroduces a per-item `await`, this goes from 4 to 60-plus.
   */
  it.each([6, 60])(
    'GET /collections/:slug costs 4 statements for a %i-item Qur’an collection',
    async (n) => {
      const items = Array.from({ length: n }, (_, idx) =>
        idx % 2 === 0
          ? baseItem({ sequence: idx + 1, surahId: 112 })
          : baseItem({
              sequence: idx + 1,
              refType: 'ayah_range',
              surahId: 2,
              ayahStart: 255,
              ayahEnd: 255,
              label: 'Ayat al-Kursi',
              citation: 'Bukhari 2311',
            }),
      );
      const { prisma, calls } = makePrisma({
        collections: [COLLECTION],
        items,
        surahs: [surah(112, 4), surah(2, 286)],
        verses: [
          verse(112, 1),
          verse(112, 2),
          verse(112, 3),
          verse(112, 4),
          verse(2, 255),
        ],
      });
      const service = new CollectionsService(prisma);

      const result = await service.getCollectionBySlug('islam', 'nightly-recitation');

      expect(calls.map((c) => `${c.model}.${c.op}`).sort()).toEqual(
        [
          'collection.findFirst',
          'collectionItem.findMany',
          'quranSurah.findMany',
          'quranVerse.findMany',
        ].sort(),
      );
      expect(calls).toHaveLength(4);
      expect(result.items).toHaveLength(n);
      expect(result.items.every((i: any) => i.content !== null)).toBe(true);
    },
  );

  it('a Hindu verse-range collection costs 5 statements, for 1 item or 40', async () => {
    const counts: number[] = [];
    for (const n of [1, 40]) {
      const { prisma, calls } = makePrisma({
        collections: [{ ...COLLECTION, faithId: 'hindu', slug: 'gita-daily' }],
        items: Array.from({ length: n }, (_, idx) =>
          baseItem({
            sequence: idx + 1,
            refType: 'hindu_verse_range',
            surahId: null,
            hinduTextSlug: 'bhagavad-gita',
            chapterNumber: 12,
            verseStart: 1,
            verseEnd: 20,
            repeatCount: 1,
            label: 'Gita 12',
            citation: 'Bhagavad Gita 12.1–20',
            grading: 'not_applicable',
          }),
        ),
        hinduTexts: [
          {
            id: 't1',
            slug: 'bhagavad-gita',
            nameEnglish: 'Bhagavad Gita',
            nameSanskrit: 'x',
            type: 'gita',
          },
        ],
        hinduChapters: [
          {
            id: 'ch12',
            textId: 't1',
            chapterNumber: 12,
            nameEnglish: 'Bhakti Yoga',
            nameSanskrit: 'x',
          },
        ],
        hinduVerses: Array.from({ length: 20 }, (_, v) => ({
          id: `v${v + 1}`,
          chapterId: 'ch12',
          verseNumber: v + 1,
          sanskritText: 'स',
          transliteration: 's',
          translations: [{ languageCode: 'en', authorName: 'a', text: 't' }],
        })),
      });
      const service = new CollectionsService(prisma);
      const result = await service.getCollectionBySlug('hindu', 'gita-daily');
      expect(result.items[0].content.verses).toHaveLength(20);
      counts.push(calls.length);
    }
    expect(counts).toEqual([5, 5]);
  });

  it('skips the resolver for every refType family a collection does not use', async () => {
    const { prisma, calls } = makePrisma({
      collections: [COLLECTION],
      items: [baseItem({ sequence: 1 })],
      surahs: [surah(112, 4)],
      verses: [verse(112, 1), verse(112, 2), verse(112, 3), verse(112, 4)],
    });
    const service = new CollectionsService(prisma);
    await service.getCollectionBySlug('islam', 'nightly-recitation');

    const models = calls.map((c) => c.model);
    expect(models).not.toContain('dua');
    expect(models).not.toContain('hinduText');
    expect(models).not.toContain('stotra');
    expect(models).not.toContain('hadithBook');
    expect(models).not.toContain('allahName');
  });

  it('never exceeds its upper bound even with every refType family present', async () => {
    const items = [
      baseItem({ sequence: 1, refType: 'surah', surahId: 112 }),
      baseItem({
        sequence: 2,
        refType: 'ayah_range',
        surahId: 2,
        ayahStart: 285,
        ayahEnd: 286,
      }),
      baseItem({ sequence: 3, refType: 'dua', surahId: null, refSlug: 'morning' }),
      baseItem({ sequence: 4, refType: 'allah_name', surahId: null, refId: '1' }),
      baseItem({
        sequence: 5,
        refType: 'hadith',
        surahId: null,
        refSlug: 'bukhari:2311',
      }),
      baseItem({
        sequence: 6,
        refType: 'hindu_verse_range',
        surahId: null,
        hinduTextSlug: 'bhagavad-gita',
        chapterNumber: 12,
        verseStart: 1,
        verseEnd: 20,
      }),
      baseItem({
        sequence: 7,
        refType: 'stotra',
        surahId: null,
        refSlug: 'hanuman-chalisa',
      }),
      baseItem({ sequence: 8, refType: 'dhikr', surahId: null, refSlug: 'tasbih' }),
    ];
    const { prisma, calls } = makePrisma({
      collections: [COLLECTION],
      items,
      surahs: [surah(112, 4), surah(2, 286)],
      hadithBooks: [{ id: 'b1', name: 'Sahih al-Bukhari', nameArabic: 'x' }],
      hinduTexts: [
        { id: 't1', slug: 'bhagavad-gita', nameEnglish: 'G', nameSanskrit: 'x', type: 'gita' },
      ],
      hinduChapters: [
        { id: 'ch12', textId: 't1', chapterNumber: 12, nameEnglish: 'B', nameSanskrit: 'x' },
      ],
    });
    const service = new CollectionsService(prisma);
    await service.getCollectionBySlug('islam', 'nightly-recitation');

    // 2 (collection + items) + 2 quran + 1 dua + 1 allahName + 2 hadith
    // + 3 hindu + 1 stotra = 12. dhikr/mantra/text resolve to no query at all.
    expect(calls.length).toBeLessThanOrEqual(12);
    expect(calls.filter((c) => c.model === 'dua')).toHaveLength(1);
    expect(calls.filter((c) => c.model === 'hinduTextVerse')).toHaveLength(1);
  });
});

describe('CollectionsService — servability and shape', () => {
  it('never queries for a draft collection — the filter is a predicate, not a post-filter', async () => {
    const { prisma, calls } = makePrisma({ collections: [COLLECTION] });
    const service = new CollectionsService(prisma);
    await service.getCollections('islam');

    const where = calls[0].args.where;
    expect(where.reviewStatus).toEqual({
      in: ['self_reviewed', 'scholar_approved'],
    });
    expect(where.isActive).toBe(true);
    expect(where.faithId).toBe('islam');
  });

  it('404s when the slug belongs to the other faith', async () => {
    const { prisma, calls } = makePrisma({ collections: [] });
    const service = new CollectionsService(prisma);
    await expect(
      service.getCollectionBySlug('hindu', 'nightly-recitation'),
    ).rejects.toBeInstanceOf(NotFoundException);
    // Short-circuits: the items query is never issued.
    expect(calls).toHaveLength(1);
  });

  it('orders items by sequence in the query, never in memory', async () => {
    const { prisma, calls } = makePrisma({
      collections: [COLLECTION],
      items: [baseItem({ sequence: 1 })],
      surahs: [surah(112, 4)],
      verses: [verse(112, 1)],
    });
    const service = new CollectionsService(prisma);
    await service.getCollectionBySlug('islam', 'nightly-recitation');

    const itemsCall = calls.find((c) => c.model === 'collectionItem');
    expect(itemsCall!.args.orderBy).toEqual({ sequence: 'asc' });
  });

  it('emits a sourceRef byte-identical to quranVerseRef() (spec §0.5 / §4.2)', async () => {
    const { prisma } = makePrisma({
      collections: [COLLECTION],
      items: [
        baseItem({
          sequence: 1,
          refType: 'ayah_range',
          surahId: 2,
          ayahStart: 255,
        }),
      ],
      surahs: [surah(2, 286)],
      verses: [verse(2, 255)],
    });
    const service = new CollectionsService(prisma);
    const result = await service.getCollectionBySlug('islam', 'nightly-recitation');

    expect(result.items[0].content.verses[0].sourceRef).toBe('quran:2:255');
  });

  it('carries repeatCount through to the response as data, not prose', async () => {
    const { prisma } = makePrisma({
      collections: [COLLECTION],
      items: [baseItem({ sequence: 1, repeatCount: 3 })],
      surahs: [surah(112, 4)],
      verses: [verse(112, 1)],
    });
    const service = new CollectionsService(prisma);
    const result = await service.getCollectionBySlug('islam', 'nightly-recitation');

    expect(result.items[0].repeatCount).toBe(3);
  });

  it('reports an unresolved item rather than rendering it empty', async () => {
    const { prisma } = makePrisma({
      collections: [COLLECTION],
      items: [baseItem({ sequence: 1, surahId: 113 })],
      surahs: [], // not seeded
      verses: [],
    });
    const service = new CollectionsService(prisma);
    const result = await service.getCollectionBySlug('islam', 'nightly-recitation');

    expect(result.items[0].content).toBeNull();
    expect(result.items[0].unresolved.reason).toContain('113');
  });

  it('exposes provenance on the resource (spec §5.4)', async () => {
    const { prisma } = makePrisma({ collections: [COLLECTION], items: [] });
    const service = new CollectionsService(prisma);
    const [row] = await service.getCollections('islam');

    expect(row.provenance).toMatchObject({
      provenanceClass: 'transmitted',
      reviewStatus: 'self_reviewed',
      curatedBy: 'spec §2',
    });
  });

  it('honours ?script=indopak with the same fallback chain as QuranService', async () => {
    const { prisma } = makePrisma({
      collections: [COLLECTION],
      items: [baseItem({ sequence: 1 })],
      surahs: [surah(112, 4)],
      verses: [{ ...verse(112, 1), textIndopak: 'IP' }],
    });
    const service = new CollectionsService(prisma);
    const result = await service.getCollectionBySlug(
      'islam',
      'nightly-recitation',
      'en',
      'indopak',
    );
    expect(result.items[0].content.verses[0].textArabic).toBe('IP');

    const { prisma: p2 } = makePrisma({
      collections: [COLLECTION],
      items: [baseItem({ sequence: 1 })],
      surahs: [surah(112, 4)],
      verses: [verse(112, 1)], // textIndopak null -> falls back to uthmani
    });
    const r2 = await new CollectionsService(p2).getCollectionBySlug(
      'islam',
      'nightly-recitation',
      'en',
      'indopak',
    );
    expect(r2.items[0].content.verses[0].textArabic).toBe('u');
  });
});
