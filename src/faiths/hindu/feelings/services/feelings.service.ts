import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';

@Injectable()
export class HinduFeelingsService {
  constructor(private prisma: PrismaService) {}

  async getEmotions() {
    const emotions = await this.prisma.hinduEmotion.findMany({
      orderBy: { nameEnglish: 'asc' },
      include: { _count: { select: { remedies: true } } },
    });
    return emotions.map(({ _count, ...emotion }) => ({
      ...emotion,
      remedyCount: _count.remedies,
    }));
  }

  async getEmotionBySlug(slug: string, lang: string = 'en') {
    const emotion = await this.prisma.hinduEmotion.findUnique({
      where: { slug },
      include: {
        remedies: {
          orderBy: { sequence: 'asc' },
          select: {
            id: true,
            note: true,
            sequence: true,
            verse: {
              select: {
                id: true,
                verseNumber: true,
                sanskritText: true,
                transliteration: true,
                chapter: { select: { chapterNumber: true } },
                text: { select: { slug: true, nameEnglish: true } },
                translations: {
                  where: { languageCode: lang },
                  select: { languageCode: true, authorName: true, text: true },
                },
              },
            },
          },
        },
      },
    });
    if (!emotion) {
      throw new NotFoundException(`Emotion with slug '${slug}' not found`);
    }
    return emotion;
  }
}
