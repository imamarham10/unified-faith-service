import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';

const CACHE_TTL = {
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
};

@Injectable()
export class HadithsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getBooks() {
    const cacheKey = 'hadiths:books';
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await (this.prisma as any).hadithBook.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.WEEK);
    return result;
  }

  async getHadiths(
    bookId?: string,
    page: number = 1,
    limit: number = 20,
    isPremiumUser: boolean = false,
  ) {
    const where: any = {};

    if (bookId) {
      const book = await (this.prisma as any).hadithBook.findUnique({
        where: { id: bookId },
      });

      if (!book) {
        throw new NotFoundException(`Book with ID ${bookId} not found`);
      }

      if (book.isPremium && !isPremiumUser) {
        throw new ForbiddenException(
          'This collection requires a premium subscription',
        );
      }

      where.bookId = bookId;
    } else if (!isPremiumUser) {
      // When browsing all books, non-premium users only see free books
      const freeBooks = await (this.prisma as any).hadithBook.findMany({
        where: { isPremium: false },
        select: { id: true },
      });
      const freeBookIds = freeBooks.map((b: any) => b.id);
      where.bookId = { in: freeBookIds };
    }

    const skip = (page - 1) * limit;

    const [hadiths, total] = await Promise.all([
      (this.prisma as any).hadith.findMany({
        where,
        skip,
        take: limit,
        orderBy: { hadithNumber: 'asc' },
        include: {
          book: {
            select: { name: true, nameArabic: true },
          },
        },
      }),
      (this.prisma as any).hadith.count({ where }),
    ]);

    return {
      hadiths,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getHadith(id: string) {
    const hadith = await (this.prisma as any).hadith.findUnique({
      where: { id },
      include: {
        book: true,
      },
    });

    if (!hadith) {
      throw new NotFoundException(`Hadith with ID ${id} not found`);
    }

    return hadith;
  }

  async searchHadiths(query: string, isPremiumUser: boolean = false) {
    if (!query || query.length < 3) {
      return [];
    }

    const where: any = {
      OR: [
        { textEnglish: { contains: query, mode: 'insensitive' } },
        { textArabic: { contains: query, mode: 'insensitive' } },
        { narratorChain: { contains: query, mode: 'insensitive' } },
        { chapterTitle: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (!isPremiumUser) {
      const freeBooks = await (this.prisma as any).hadithBook.findMany({
        where: { isPremium: false },
        select: { id: true },
      });
      const freeBookIds = freeBooks.map((b: any) => b.id);
      where.bookId = { in: freeBookIds };
    }

    return (this.prisma as any).hadith.findMany({
      where,
      include: {
        book: {
          select: { name: true, nameArabic: true },
        },
      },
      take: 50,
    });
  }

  async getDailyHadith() {
    const cacheKey = 'hadiths:daily';
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    // Count only hadiths from free books
    const freeBooks = await (this.prisma as any).hadithBook.findMany({
      where: { isPremium: false },
      select: { id: true },
    });
    const freeBookIds = freeBooks.map((b: any) => b.id);

    const count = await (this.prisma as any).hadith.count({
      where: { bookId: { in: freeBookIds } },
    });

    if (count === 0) {
      return null;
    }

    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const offset = dayOfYear % count;

    const results = await (this.prisma as any).hadith.findMany({
      where: { bookId: { in: freeBookIds } },
      skip: offset,
      take: 1,
      include: {
        book: true,
      },
    });

    const result = results[0] ?? null;
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.DAY);
    return result;
  }

  async addFavorite(userId: string, hadithId: string) {
    return (this.prisma as any).userFavoriteHadith.upsert({
      where: {
        userId_hadithId: {
          userId,
          hadithId,
        },
      },
      create: {
        userId,
        hadithId,
      },
      update: {},
    });
  }

  async getFavorites(userId: string) {
    const favorites = await (this.prisma as any).userFavoriteHadith.findMany({
      where: { userId },
    });

    const hadithIds = favorites.map((f: any) => f.hadithId);
    if (hadithIds.length === 0) {
      return [];
    }

    return (this.prisma as any).hadith.findMany({
      where: {
        id: { in: hadithIds },
      },
      include: {
        book: true,
      },
    });
  }

  async removeFavorite(userId: string, hadithId: string) {
    return (this.prisma as any).userFavoriteHadith.deleteMany({
      where: {
        userId,
        hadithId,
      },
    });
  }
}
