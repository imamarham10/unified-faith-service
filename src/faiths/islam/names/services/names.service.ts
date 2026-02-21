import { Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';

const CACHE_TTL = {
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
};

@Injectable()
export class NamesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getAllNames() {
    const cacheKey = 'names:allah';
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await (this.prisma as any).allahName.findMany({
      orderBy: { id: 'asc' },
    });
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.WEEK);
    return result;
  }

  async getName(id: number) {
    const name = await (this.prisma as any).allahName.findUnique({
      where: { id },
    });

    if (!name) {
      throw new Error(`Name with ID ${id} not found`);
    }

    return name;
  }

  async addFavorite(userId: string, nameId: number) {
    // Check if name exists
    const name = await this.getName(nameId);

    // Create favorite
    return (this.prisma as any).userFavoriteAllahName.create({
      data: {
        userId,
        nameId,
      },
    });
  }

  async getDailyName() {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    // There are 99 names, so we cycle through them
    // ID starts from 1
    const id = (dayOfYear % 99) + 1;

    return this.getName(id);
  }

  // Muhammad Names methods
  async getAllMuhammadNames() {
    const cacheKey = 'names:muhammad';
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await (this.prisma as any).muhammadName.findMany({
      orderBy: { id: 'asc' },
    });
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.WEEK);
    return result;
  }

  async getMuhammadName(id: number) {
    const name = await (this.prisma as any).muhammadName.findUnique({
      where: { id },
    });

    if (!name) {
      throw new Error(`Muhammad's name with ID ${id} not found`);
    }

    return name;
  }

  async addMuhammadFavorite(userId: string, nameId: number) {
    // Check if name exists
    await this.getMuhammadName(nameId);

    // Create favorite
    return (this.prisma as any).userFavoriteMuhammadName.create({
      data: {
        userId,
        nameId,
      },
    });
  }

  async getDailyMuhammadName() {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    // There are 99 names, so we cycle through them
    // ID starts from 1
    const id = (dayOfYear % 99) + 1;

    return this.getMuhammadName(id);
  }

  async getUserMuhammadFavorites(userId: string) {
    const favorites = await (this.prisma as any).userFavoriteMuhammadName.findMany({
      where: { userId },
    });

    const nameIds = favorites.map((f: any) => f.nameId);
    if (nameIds.length === 0) {
      return [];
    }

    return (this.prisma as any).muhammadName.findMany({
      where: { id: { in: nameIds } },
      orderBy: { id: 'asc' },
    });
  }
}
