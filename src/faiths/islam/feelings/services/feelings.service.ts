
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { EmotionResponseDto, EmotionDetailResponseDto } from '../dto/feelings.dto';

@Injectable()
export class FeelingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all available emotions
   */
  async getAllEmotions(): Promise<EmotionResponseDto[]> {
    const emotions = await (this.prisma as any).emotion.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
      },
    });

    return emotions;
  }

  /**
   * Get details for a specific emotion including remedies
   */
  async getEmotionBySlug(slug: string): Promise<EmotionDetailResponseDto> {
    const emotion = await (this.prisma as any).emotion.findUnique({
      where: { slug },
      include: {
        remedies: {
          select: {
            id: true,
            arabicText: true,
            transliteration: true,
            translation: true,
            source: true,
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
