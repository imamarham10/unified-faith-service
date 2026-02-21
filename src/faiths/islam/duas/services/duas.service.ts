import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';

@Injectable()
export class DuasService {
  constructor(private prisma: PrismaService) {}

  async getDuas(filters: any) {
    const where: any = {};

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    return (this.prisma as any).dua.findMany({
      where,
      include: {
        category: true,
      },
    });
  }

  async getDua(id: string) {
    return (this.prisma as any).dua.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  async getCategories() {
    return (this.prisma as any).duaCategory.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async searchDuas(query: string) {
    return (this.prisma as any).dua.findMany({
      where: {
        OR: [
          {
            titleEnglish: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            titleArabic: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            textEnglish: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        category: true,
      },
    });
  }

  async createCustomDua(createDuaDto: any) {
    return { success: true, message: 'Custom duas coming soon' };
  }

  async addFavorite(userId: string, duaId: string) {
    return (this.prisma as any).userFavoriteDua.upsert({
      where: {
        userId_duaId: {
          userId,
          duaId,
        },
      },
      create: {
        userId,
        duaId,
      },
      update: {},
    });
  }

  async getFavorites(userId: string) {
    const favorites = await (this.prisma as any).userFavoriteDua.findMany({
      where: { userId },
    });

    const duaIds = favorites.map((f: any) => f.duaId);
    if (duaIds.length === 0) {
      return [];
    }

    return (this.prisma as any).dua.findMany({
      where: {
        id: { in: duaIds },
      },
      include: {
        category: true,
      },
    });
  }

  async getDailyDua() {
    const count = await (this.prisma as any).dua.count();
    if (count === 0) {
      return null;
    }

    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const offset = dayOfYear % count;

    const results = await (this.prisma as any).dua.findMany({
      skip: offset,
      take: 1,
      include: {
        category: true,
      },
    });

    return results[0] ?? null;
  }
}
