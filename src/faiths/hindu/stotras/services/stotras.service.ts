import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';

@Injectable()
export class StotrasService {
  constructor(private prisma: PrismaService) {}

  private listSelect() {
    return {
      id: true,
      slug: true,
      titleSanskrit: true,
      titleEnglish: true,
      type: true,
      deityKey: true,
      isPremium: true,
      category: { select: { slug: true, name: true } },
      _count: { select: { verses: true } },
    };
  }

  private toListItem({ _count, ...stotra }: any) {
    return { ...stotra, verseCount: _count.verses };
  }

  async getCategories() {
    const categories = await this.prisma.stotraCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { stotras: true } } },
    });
    return categories.map(({ _count, ...category }) => ({
      ...category,
      stotraCount: _count.stotras,
    }));
  }

  async getStotras(filters: {
    category?: string;
    deity?: string;
    type?: string;
  }) {
    const stotras = await this.prisma.stotra.findMany({
      where: {
        ...(filters.category ? { category: { slug: filters.category } } : {}),
        ...(filters.deity ? { deityKey: filters.deity } : {}),
        ...(filters.type ? { type: filters.type } : {}),
      },
      select: this.listSelect(),
      orderBy: { titleEnglish: 'asc' },
    });
    return stotras.map((s) => this.toListItem(s));
  }

  async search(query: string) {
    const stotras = await this.prisma.stotra.findMany({
      where: {
        OR: [
          { titleEnglish: { contains: query, mode: 'insensitive' } },
          { titleSanskrit: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: this.listSelect(),
      orderBy: { titleEnglish: 'asc' },
    });
    return stotras.map((s) => this.toListItem(s));
  }

  async getStotraBySlug(slug: string, lang: string = 'en') {
    const stotra = await this.prisma.stotra.findUnique({
      where: { slug },
      include: {
        category: { select: { slug: true, name: true } },
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
    if (!stotra) {
      throw new NotFoundException(`Stotra with slug '${slug}' not found`);
    }
    return stotra;
  }

  async addFavorite(userId: string, stotraId: string) {
    const stotra = await this.prisma.stotra.findUnique({
      where: { id: stotraId },
    });
    if (!stotra) {
      throw new NotFoundException(`Stotra with id '${stotraId}' not found`);
    }
    return this.prisma.userFavoriteStotra.upsert({
      where: { userId_stotraId: { userId, stotraId } },
      create: { userId, stotraId },
      update: {},
    });
  }

  async getFavorites(userId: string) {
    const favorites = await this.prisma.userFavoriteStotra.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        stotra: { select: this.listSelect() },
      },
    });
    return favorites.map((f) => ({
      ...f,
      stotra: this.toListItem(f.stotra),
    }));
  }

  async removeFavorite(userId: string, stotraId: string) {
    const result = await this.prisma.userFavoriteStotra.deleteMany({
      where: { userId, stotraId },
    });
    return { deleted: result.count > 0 };
  }
}
