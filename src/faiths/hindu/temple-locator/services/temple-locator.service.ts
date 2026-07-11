import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';

@Injectable()
export class TempleLocatorService {
  constructor(private prisma: PrismaService) {}

  async getTemples(filters: { deity?: string; state?: string; q?: string }) {
    return this.prisma.temple.findMany({
      where: {
        ...(filters.deity ? { deityKey: filters.deity } : {}),
        ...(filters.state ? { state: filters.state } : {}),
        ...(filters.q
          ? { name: { contains: filters.q, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async getStates(): Promise<string[]> {
    const rows = await this.prisma.temple.findMany({
      where: { state: { not: null } },
      select: { state: true },
      distinct: ['state'],
      orderBy: { state: 'asc' },
    });
    return rows.map((r) => r.state as string);
  }

  async getNearby(lat: number, lng: number, radiusKm: number = 100) {
    const temples = await this.prisma.temple.findMany();
    return temples
      .map((temple) => ({
        ...temple,
        distanceKm: this.haversineKm(lat, lng, temple.lat, temple.lng),
      }))
      .filter((temple) => temple.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async getTempleById(id: string) {
    const temple = await this.prisma.temple.findUnique({ where: { id } });
    if (!temple) {
      throw new NotFoundException(`Temple with id '${id}' not found`);
    }
    return temple;
  }

  async addFavorite(userId: string, templeId: string) {
    const temple = await this.prisma.temple.findUnique({
      where: { id: templeId },
    });
    if (!temple) {
      throw new NotFoundException(`Temple with id '${templeId}' not found`);
    }
    return this.prisma.userFavoriteTemple.upsert({
      where: { userId_templeId: { userId, templeId } },
      create: { userId, templeId },
      update: {},
    });
  }

  async getFavorites(userId: string) {
    return this.prisma.userFavoriteTemple.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        temple: true,
      },
    });
  }

  async removeFavorite(userId: string, templeId: string) {
    const result = await this.prisma.userFavoriteTemple.deleteMany({
      where: { userId, templeId },
    });
    return { deleted: result.count > 0 };
  }

  private haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(earthRadiusKm * c * 100) / 100;
  }
}
