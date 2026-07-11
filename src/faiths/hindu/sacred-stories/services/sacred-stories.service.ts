import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';

@Injectable()
export class SacredStoriesService {
  constructor(private prisma: PrismaService) {}

  private listSelect() {
    return {
      id: true,
      storyNumber: true,
      title: true,
      summary: true,
      deityKey: true,
      characters: true,
      collection: { select: { slug: true, name: true, sourceText: true } },
    };
  }

  async getCollections() {
    const collections = await this.prisma.hinduStoryCollection.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { stories: true } } },
    });
    return collections.map(({ _count, ...collection }) => ({
      ...collection,
      storyCount: _count.stories,
    }));
  }

  async getStories(filters: { collection?: string; deity?: string }) {
    return this.prisma.hinduStory.findMany({
      where: {
        ...(filters.collection
          ? { collection: { slug: filters.collection } }
          : {}),
        ...(filters.deity ? { deityKey: filters.deity } : {}),
      },
      select: this.listSelect(),
      orderBy: [{ collection: { slug: 'asc' } }, { storyNumber: 'asc' }],
    });
  }

  async search(query: string) {
    return this.prisma.hinduStory.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: this.listSelect(),
      orderBy: [{ collection: { slug: 'asc' } }, { storyNumber: 'asc' }],
    });
  }

  async getStoryById(id: string) {
    const story = await this.prisma.hinduStory.findUnique({
      where: { id },
      select: { ...this.listSelect(), body: true },
    });
    if (!story) {
      throw new NotFoundException(`Story with id '${id}' not found`);
    }
    return story;
  }

  async addFavorite(userId: string, storyId: string) {
    const story = await this.prisma.hinduStory.findUnique({
      where: { id: storyId },
    });
    if (!story) {
      throw new NotFoundException(`Story with id '${storyId}' not found`);
    }
    return this.prisma.userFavoriteHinduStory.upsert({
      where: { userId_storyId: { userId, storyId } },
      create: { userId, storyId },
      update: {},
    });
  }

  async getFavorites(userId: string) {
    return this.prisma.userFavoriteHinduStory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        story: { select: this.listSelect() },
      },
    });
  }

  async removeFavorite(userId: string, storyId: string) {
    const result = await this.prisma.userFavoriteHinduStory.deleteMany({
      where: { userId, storyId },
    });
    return { deleted: result.count > 0 };
  }
}
