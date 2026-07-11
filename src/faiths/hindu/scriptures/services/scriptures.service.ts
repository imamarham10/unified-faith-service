import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { CreateBookmarkDto } from '../dto/create-bookmark.dto';

@Injectable()
export class ScripturesService {
  constructor(private prisma: PrismaService) {}

  private verseInclude(lang: string) {
    return {
      chapter: { select: { chapterNumber: true, nameEnglish: true } },
      text: { select: { slug: true, nameEnglish: true } },
      translations: {
        where: { languageCode: lang },
        select: {
          id: true,
          languageCode: true,
          authorName: true,
          text: true,
        },
      },
    };
  }

  async getTexts() {
    const texts = await this.prisma.hinduText.findMany({
      orderBy: { nameEnglish: 'asc' },
      include: { _count: { select: { chapters: true } } },
    });
    return texts.map(({ _count, ...text }) => ({
      ...text,
      chapterCount: _count.chapters,
    }));
  }

  async getTextBySlug(slug: string) {
    const text = await this.prisma.hinduText.findUnique({
      where: { slug },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' },
          include: { _count: { select: { verses: true } } },
        },
      },
    });
    if (!text) {
      throw new NotFoundException(`Text with slug '${slug}' not found`);
    }
    return {
      ...text,
      chapters: text.chapters.map(({ _count, ...chapter }) => ({
        ...chapter,
        verseCount: _count.verses,
      })),
    };
  }

  async getChapter(slug: string, chapterNumber: number, lang: string = 'en') {
    const text = await this.prisma.hinduText.findUnique({ where: { slug } });
    if (!text) {
      throw new NotFoundException(`Text with slug '${slug}' not found`);
    }
    const chapter = await this.prisma.hinduTextChapter.findUnique({
      where: { textId_chapterNumber: { textId: text.id, chapterNumber } },
      include: {
        verses: {
          orderBy: { verseNumber: 'asc' },
          include: {
            translations: {
              where: { languageCode: lang },
              select: {
                id: true,
                languageCode: true,
                authorName: true,
                text: true,
              },
            },
          },
        },
      },
    });
    if (!chapter) {
      throw new NotFoundException(
        `Chapter ${chapterNumber} not found in '${slug}'`,
      );
    }
    return chapter;
  }

  async getVerse(id: string, lang: string = 'en') {
    const verse = await this.prisma.hinduTextVerse.findUnique({
      where: { id },
      include: this.verseInclude(lang),
    });
    if (!verse) {
      throw new NotFoundException(`Verse with id '${id}' not found`);
    }
    return verse;
  }

  async getFeatured(lang: string = 'en', slug?: string) {
    return this.prisma.hinduTextVerse.findMany({
      where: {
        isFeatured: true,
        ...(slug ? { text: { slug } } : {}),
      },
      include: this.verseInclude(lang),
      orderBy: [{ chapter: { chapterNumber: 'asc' } }, { verseNumber: 'asc' }],
    });
  }

  async search(query: string, lang: string = 'en') {
    return this.prisma.hinduTextVerse.findMany({
      where: {
        OR: [
          {
            translations: {
              some: {
                text: { contains: query, mode: 'insensitive' },
                languageCode: lang,
              },
            },
          },
          { transliteration: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: this.verseInclude(lang),
      orderBy: [{ chapter: { chapterNumber: 'asc' } }, { verseNumber: 'asc' }],
      take: 50,
    });
  }

  async addBookmark(userId: string, dto: CreateBookmarkDto) {
    const verse = await this.prisma.hinduTextVerse.findUnique({
      where: { id: dto.verseId },
    });
    if (!verse) {
      throw new NotFoundException(`Verse with id '${dto.verseId}' not found`);
    }
    return this.prisma.hinduScriptureBookmark.upsert({
      where: { userId_verseId: { userId, verseId: dto.verseId } },
      create: { userId, verseId: dto.verseId, note: dto.note },
      update: { note: dto.note },
    });
  }

  async getBookmarks(userId: string) {
    return this.prisma.hinduScriptureBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        note: true,
        createdAt: true,
        verse: { include: this.verseInclude('en') },
      },
    });
  }

  async removeBookmark(userId: string, verseId: string) {
    const result = await this.prisma.hinduScriptureBookmark.deleteMany({
      where: { userId, verseId },
    });
    return { deleted: result.count > 0 };
  }
}
