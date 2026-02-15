import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';

@Injectable()
export class QuranService {
  constructor(private prisma: PrismaService) {}

  async getAllSurahs() {
    return this.prisma.quranSurah.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async getSurah(surahId: number, language: string = 'en') {
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

    return surah;
  }

  async getVerse(verseKey: string, language: string = 'en') {
    // verseKey typically "surahId:verseNumber", but implementation requested ID. 
    // Assuming API passes database UUID or "surah:verse" key.
    // If param is database ID (UUID):
    let verse = await this.prisma.quranVerse.findUnique({
      where: { id: verseKey },
      include: {
        surah: true,
        translations: { where: { language } },
      },
    });

    // If not found by UUID, try to parse "surah:verse"
    if (!verse && verseKey.includes(':')) {
        const [surahId, verseNum] = verseKey.split(':').map(Number);
        if (!isNaN(surahId) && !isNaN(verseNum)) {
            verse = await this.prisma.quranVerse.findUnique({
                where: { surahId_verseNumber: { surahId, verseNumber: verseNum } },
                include: {
                    surah: true,
                    translations: { where: { language } },
                }
            });
        }
    }

    if (!verse) {
      throw new NotFoundException(`Verse ${verseKey} not found`);
    }

    return verse;
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
    return this.prisma.userQuranBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      // We might want to include verse text here?
      // Since there is no relation defined in schema between Bookmark and QuranVerse (it uses surahId/verseNumber integers),
      // we can't using `include`. We'd have to fetch manually or just return metadata.
      // For now returning metadata is fine.
    });
  }
}
