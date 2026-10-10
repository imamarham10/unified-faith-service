import { Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';

const CACHE_TTL = {
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
};

type ScriptType = 'simple' | 'uthmani' | 'indopak';

@Injectable()
export class QuranService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Which Unicode string `?script=` asks for.
   *
   * **`indopak` used to be an alias for `uthmani` here, and that was the
   * bug.** IndoPak is an *encoding*, not a typeface: the subcontinental
   * muṣḥaf writes different codepoints, not the same ones in a different
   * font. 2:142 is `ٱلسُّفَهَآءُ` with U+0671 alef-wasla in Uthmani and
   * `السُّفَهَآءُ` with a plain U+0627 in IndoPak, so no font can bridge the
   * two. The mobile app defaults its Arabic-script preference to Indo-Pak and
   * India is this app's primary market, which means the old aliasing served
   * the wrong script to most of the userbase, by default, while naming the
   * right one. See `docs/quran_script_provenance.md`.
   *
   * The fallback chain for `indopak` is deliberate rather than strict.
   * `text_indopak` is nullable — a database that has taken the migration but
   * not `prisma/seed-quran-scripts.ts` holds nulls — and a reader should see
   * *a* muṣḥaf rather than an empty verse while that gap exists.
   */
  private resolveArabicText(verse: any, script: ScriptType): string {
    if (script === 'indopak') {
      return verse.textIndopak || verse.textUthmani || verse.textArabic;
    }
    if (script === 'uthmani') {
      return verse.textUthmani || verse.textArabic;
    }
    return verse.textArabic;
  }

  /**
   * `textIndopak` is listed explicitly rather than riding along in `...rest`.
   * Both script columns are destructured out and only the one that is part of
   * the response contract is put back — otherwise adding a column to
   * `quran_verses` silently changes the shape of every surah response.
   *
   * Additive: `textArabic` keeps the exact meaning it had (the script named
   * by `?script=`), `textUthmani` and `textSimple` stay stripped as before,
   * and `textIndopak` is new. Existing clients are unaffected; a client that
   * wants both scripts side by side no longer needs a second request.
   */
  private mapVerseScript(verse: any, script: ScriptType) {
    const { textUthmani, textSimple, textIndopak, ...rest } = verse;
    return {
      ...rest,
      textArabic: this.resolveArabicText(verse, script),
      textIndopak: textIndopak ?? null,
    };
  }

  async getAllSurahs() {
    const cacheKey = 'quran:surahs';
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await this.prisma.quranSurah.findMany({
      orderBy: { id: 'asc' },
    });
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.WEEK);
    return result;
  }

  async getSurah(surahId: number, language: string = 'en', script: ScriptType = 'simple') {
    const surah = await this.prisma.quranSurah.findUnique({
      where: { id: surahId },
      include: {
        verses: {
          orderBy: { verseNumber: 'asc' },
          include: {
            translations: {
              where: { language },
            },
          },
        },
      },
    });

    if (!surah) {
      throw new NotFoundException(`Surah with ID ${surahId} not found`);
    }

    return {
      ...surah,
      verses: surah.verses.map((v) => this.mapVerseScript(v, script)),
    };
  }

  async getVerse(verseKey: string, language: string = 'en') {
    // verseKey typically "surahId:verseNumber", but implementation requested ID.
    // Assuming API passes database UUID or "surah:verse" key.
    // If param is database ID (UUID):
    const verseInclude = {
      surah: true,
      translations: { where: { language } },
      transliteration: true,
    };
    let verse = await this.prisma.quranVerse.findUnique({
      where: { id: verseKey },
      include: verseInclude,
    });

    // If not found by UUID, try to parse "surah:verse"
    if (!verse && verseKey.includes(':')) {
        const [surahId, verseNum] = verseKey.split(':').map(Number);
        if (!isNaN(surahId) && !isNaN(verseNum)) {
            verse = await this.prisma.quranVerse.findUnique({
                where: { surahId_verseNumber: { surahId, verseNumber: verseNum } },
                include: verseInclude,
            });
        }
    }

    if (!verse) {
      throw new NotFoundException(`Verse ${verseKey} not found`);
    }

    // `context` is additive (same pattern as hadiths): prev/next refs for
    // verse-page navigation, crossing surah boundaries at the edges.
    let prev: { surahId: number; verseNumber: number } | null = null;
    let next: { surahId: number; verseNumber: number } | null = null;
    if (verse.verseNumber > 1) {
      prev = { surahId: verse.surahId, verseNumber: verse.verseNumber - 1 };
    } else if (verse.surahId > 1) {
      const prevSurah = await this.prisma.quranSurah.findUnique({
        where: { id: verse.surahId - 1 },
        select: { verseCount: true },
      });
      if (prevSurah) {
        prev = { surahId: verse.surahId - 1, verseNumber: prevSurah.verseCount };
      }
    }
    if (verse.verseNumber < verse.surah.verseCount) {
      next = { surahId: verse.surahId, verseNumber: verse.verseNumber + 1 };
    } else if (verse.surahId < 114) {
      next = { surahId: verse.surahId + 1, verseNumber: 1 };
    }

    return { ...verse, context: { prev, next } };
  }

  async searchVerses(query: string, language: string = 'en') {
    if (!query || query.length < 3) {
      return [];
    }

    return this.prisma.quranVerse.findMany({
      where: {
        OR: [
          { textSimple: { contains: query, mode: 'insensitive' } },
          { 
            translations: { 
              some: { 
                text: { contains: query, mode: 'insensitive' },
                language 
              } 
            } 
          }
        ]
      },
      include: {
        surah: true,
        translations: { where: { language } },
      },
      take: 50,
    });
  }

  async addBookmark(userId: string, data: { surahId: number; verseNumber: number; note?: string }) {
    // Verify verse exists
    const verse = await this.prisma.quranVerse.findUnique({
        where: { surahId_verseNumber: { surahId: data.surahId, verseNumber: data.verseNumber } }
    });

    if (!verse) {
        throw new NotFoundException('Verse not found');
    }

    // Since we don't have unique constraint on (userId, surahId, verseNumber) in schema provided earlier?
    // Let's check schema: @@index([userId]). actually no unique constraint on bookmarks in schema provided earlier.
    // Ideally we should double check if we want duplicates. Usually no.
    // Schema provided:
    /*
    model UserQuranBookmark {
        id          String   @id @default(uuid())
        userId      String   @map("user_id")
        surahId     Int      @map("surah_id")
        verseNumber Int      @map("verse_number")
        note        String?
        createdAt   DateTime @default(now()) @map("created_at")

        @@index([userId])
        @@map("user_quran_bookmarks")
    }
    */
    // I will allow multiples for now as per schema or just create new.
    
    return this.prisma.userQuranBookmark.create({
      data: {
        userId,
        surahId: data.surahId,
        verseNumber: data.verseNumber,
        note: data.note,
      },
    });
  }

  async getBookmarks(userId: string) {
    const bookmarks = await this.prisma.userQuranBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (bookmarks.length === 0) return [];

    // Enrich with surah names
    const surahIds = [...new Set(bookmarks.map((b) => b.surahId))];
    const surahs = await this.prisma.quranSurah.findMany({
      where: { id: { in: surahIds } },
      select: { id: true, nameEnglish: true, nameArabic: true, nameTransliteration: true },
    });
    const surahMap = new Map(surahs.map((s) => [s.id, s]));

    return bookmarks.map((b) => {
      const surah = surahMap.get(b.surahId);
      return {
        ...b,
        surahName: surah?.nameEnglish ?? null,
        surahNameArabic: surah?.nameArabic ?? null,
        surahNameTransliteration: surah?.nameTransliteration ?? null,
      };
    });
  }

  async deleteBookmark(userId: string, bookmarkId: string) {
    // Verify the bookmark belongs to this user before deleting
    const bookmark = await this.prisma.userQuranBookmark.findFirst({
      where: { id: bookmarkId, userId },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    return this.prisma.userQuranBookmark.delete({
      where: { id: bookmarkId },
    });
  }

  async getAvailableTranslations(language: string = 'en') {
    const cacheKey = `quran:translations:${language}`;
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await this.prisma.quranTranslation.findMany({
      where: { language },
      select: { authorName: true, isPremium: true },
      distinct: ['authorName'],
    });

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.WEEK);
    return result;
  }

  async getSurahPremium(
    surahId: number,
    language: string,
    authorNames: string[],
    includeTransliteration: boolean,
    isPremiumUser: boolean,
    script: ScriptType = 'simple',
  ) {
    // If the user is not premium, force the free translation only
    const effectiveAuthorNames = isPremiumUser
      ? authorNames
      : ['Saheeh International'];

    const surah = await this.prisma.quranSurah.findUnique({
      where: { id: surahId },
      include: {
        verses: {
          orderBy: { verseNumber: 'asc' },
          include: {
            translations: {
              where: {
                language,
                authorName: { in: effectiveAuthorNames },
              },
            },
            transliteration: includeTransliteration ? true : false,
          },
        },
      },
    });

    if (!surah) {
      throw new NotFoundException(`Surah with ID ${surahId} not found`);
    }

    return {
      ...surah,
      verses: surah.verses.map((v) => this.mapVerseScript(v, script)),
    };
  }

  async getReciters() {
    const cacheKey = 'quran:reciters';
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await this.prisma.quranReciter.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.WEEK);
    return result;
  }

  async getSurahAudioUrls(reciterSlug: string, surahId: number) {
    const reciter = await this.prisma.quranReciter.findUnique({
      where: { slug: reciterSlug },
    });

    if (!reciter) {
      throw new NotFoundException(`Reciter with slug '${reciterSlug}' not found`);
    }

    const surah = await this.prisma.quranSurah.findUnique({
      where: { id: surahId },
    });

    if (!surah) {
      throw new NotFoundException(`Surah with ID ${surahId} not found`);
    }

    // Compute global verse offset: total verses in all surahs before this one
    const precedingSurahs = await this.prisma.quranSurah.findMany({
      where: { id: { lt: surahId } },
      select: { verseCount: true },
    });
    const globalOffset = precedingSurahs.reduce(
      (sum, s) => sum + s.verseCount,
      0,
    );

    // Generate audio URLs for each verse in this surah
    const urls = Array.from({ length: surah.verseCount }, (_, i) => {
      const verseNumber = i + 1;
      return {
        verseNumber,
        url: `${reciter.audioBaseUrl}${globalOffset + verseNumber}.mp3`,
      };
    });

    return {
      reciter: reciter.name,
      surahId,
      urls,
    };
  }
}
