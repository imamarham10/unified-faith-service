import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { CreateJapaGoalDto } from '../dto/create-japa-goal.dto';

@Injectable()
export class JapaGoalService {
  constructor(private prisma: PrismaService) {}

  async listGoals(userId: string) {
    const goals = await this.prisma.japaGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Decorate each goal with progress fields
    const decorated = await Promise.all(
      goals.map(async (g) => {
        const history = await this.prisma.japaHistory.findMany({
          where: {
            userId,
            mantra: g.mantraSanskrit,
            date: { gte: g.startDate, lte: g.endDate },
          },
        });
        const currentCount = history.reduce((sum, h) => sum + h.count, 0);
        const progressPercent = g.targetCount > 0
          ? Math.min(100, Math.round((currentCount / g.targetCount) * 100))
          : 0;
        const now = new Date();
        const daysRemaining = Math.max(0, Math.ceil((g.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const isComplete = currentCount >= g.targetCount;

        return { ...g, currentCount, progressPercent, daysRemaining, isComplete };
      }),
    );
    return decorated;
  }

  async createGoal(userId: string, dto: CreateJapaGoalDto) {
    return this.prisma.japaGoal.create({
      data: {
        userId,
        mantraSanskrit: dto.mantraSanskrit,
        targetCount: dto.targetCount,
        period: dto.period,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }
}
