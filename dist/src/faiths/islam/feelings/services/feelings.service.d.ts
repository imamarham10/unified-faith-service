import { PrismaService } from '../../../../common/utils/prisma.service';
import { EmotionResponseDto, EmotionDetailResponseDto } from '../dto/feelings.dto';
export declare class FeelingsService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllEmotions(): Promise<EmotionResponseDto[]>;
    getEmotionBySlug(slug: string): Promise<EmotionDetailResponseDto>;
}
