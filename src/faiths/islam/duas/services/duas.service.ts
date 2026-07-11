import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';

@Injectable()
export class DuasService {
  constructor(private prisma: PrismaService) {}

  // Additive alias: the Prisma column is `textTranslit` but the mobile client
  // reads `textTransliteration`. Web keeps reading `textTranslit`.
  private aliasDua<T extends { textTranslit?: string | null } | null>(dua: T) {
    if (!dua) return dua;
    return {
      ...dua,
      textTransliteration: dua.textTranslit ?? null,
    };
  }

  async getDuas(filters: any) {
    const where: any = {};

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    const duas = await (this.prisma as any).dua.findMany({
      where,
      include: {
        category: true,
      },
    });
    return duas.map((d: any) => this.aliasDua(d));
  }

  async getDua(id: string) {
    const dua = await (this.prisma as any).dua.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
    return this.aliasDua(dua);
  }

  async getCategories() {
    return (this.prisma as any).duaCategory.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async searchDuas(query: string) {
    const duas = await (this.prisma as any).dua.findMany({
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
    return duas.map((d: any) => this.aliasDua(d));
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

  async removeFavorite(userId: string, duaId: string) {
    const favorite = await (this.prisma as any).userFavoriteDua.findUnique({
      where: {
        userId_duaId: {
          userId,
          duaId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await (this.prisma as any).userFavoriteDua.delete({
      where: {
        userId_duaId: {
          userId,
          duaId,
        },
      },
    });

    return { success: true, duaId };
  }

  async getFavorites(userId: string) {
    const favorites = await (this.prisma as any).userFavoriteDua.findMany({
      where: { userId },
    });

    const duaIds = favorites.map((f: any) => f.duaId);
    if (duaIds.length === 0) {
      return [];
    }

    const duas = await (this.prisma as any).dua.findMany({
      where: {
        id: { in: duaIds },
      },
      include: {
        category: true,
      },
    });
    return duas.map((d: any) => this.aliasDua(d));
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

    return this.aliasDua(results[0] ?? null);
  }
}
