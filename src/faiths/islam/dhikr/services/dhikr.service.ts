import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { DhikrDictionaryService } from './dhikr-dictionary.service';

@Injectable()
export class DhikrService {
  constructor(
    private prisma: PrismaService,
    private dictionaryService: DhikrDictionaryService,
  ) {}

  async getCounters(userId: string) {
    return this.prisma.dhikrCounter.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createCounter(userId: string, data: { name: string; phrase: string; targetCount?: number }) {
    // Resolve phrase using dictionary service
    const resolvedPhrase = this.dictionaryService.resolvePhrase(data.phrase);

    return this.prisma.dhikrCounter.create({
      data: {
        userId,
        name: data.name,
        phraseArabic: resolvedPhrase.arabic,
        phraseTranslit: resolvedPhrase.transliteration,
        phraseEnglish: resolvedPhrase.english,
        targetCount: data.targetCount,
      },
    });
  }

  async incrementCounter(id: string, count: number = 1) {
    const counter = await this.prisma.dhikrCounter.findUnique({
      where: { id },
    });

    if (!counter) {
      throw new NotFoundException('Counter not found');
    }

    // Transaction: Update counter total AND update daily history
    const today = new Date();
    today.setHours(0,0,0,0);

    return this.prisma.$transaction(async (tx) => {
        // 1. Update counter
        const updatedCounter = await tx.dhikrCounter.update({
            where: { id },
            data: { count: { increment: count } }
        });

        // 2. Update history
        await tx.dhikrHistory.upsert({
            where: {
                userId_phraseArabic_date: {
                    userId: counter.userId,
                    phraseArabic: counter.phraseArabic,
                    date: today,
                }
            },
            update: {
                count: { increment: count }
            },
            create: {
                userId: counter.userId,
                phraseArabic: counter.phraseArabic,
                phraseTranslit: counter.phraseTranslit,
                phraseEnglish: counter.phraseEnglish,
                date: today,
                count: count
            }
        });

        return updatedCounter;
    });
  }

  async deleteCounter(id: string) {
    // Soft delete or hard delete? Schema has isActive, so soft delete
    // But schema says isActive @default(true).
    // Let's check schema for delete cascade... No cascade on history.
    // I'll soft delete by setting isActive=false, or delete if requested.
    // Let's hard delete for now as per usual REST API unless soft delete expected.
    // Actually, preserving history is important, so maybe just delete the counter UI item. history is separate table.
    // Let's delete the counter.
    return this.prisma.dhikrCounter.delete({
        where: { id }
    });
  }

  async createGoal(userId: string, data: { phrase: string; targetCount: number; period: string; endDate?: string }) {
      // Resolve phrase using dictionary service
      const resolvedPhrase = this.dictionaryService.resolvePhrase(data.phrase);

      const today = new Date();
      const start = new Date(today);
      let end = data.endDate ? new Date(data.endDate) : new Date(today);
      if (!data.endDate) {
          if (data.period === 'weekly') end.setDate(end.getDate() + 7);
          else if (data.period === 'monthly') end.setMonth(end.getMonth() + 1);
          else end.setDate(end.getDate() + 1); // daily default
      }

      return this.prisma.dhikrGoal.create({
          data: {
              userId,
              phraseArabic: resolvedPhrase.arabic,
              phraseTranslit: resolvedPhrase.transliteration,
              phraseEnglish: resolvedPhrase.english,
              targetCount: data.targetCount,
              period: data.period,
              startDate: start,
              endDate: end,
          }
      });
  }

  async getGoals(userId: string) {
    const today = new Date();
    return this.prisma.dhikrGoal.findMany({
        where: { 
            userId,
            endDate: { gte: today } // Active goals
        }
    });
  }

  async getStats(userId: string) {
    // Total lifetime dhikr
    const history = await this.prisma.dhikrHistory.aggregate({
        where: { userId },
        _sum: { count: true }
    });

    // Counts by phrase
    const byPhrase = await this.prisma.dhikrHistory.groupBy({
        by: ['phraseArabic', 'phraseEnglish'],
        where: { userId },
        _sum: { count: true }
    });

    // Last 7 days activity
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const recentActivity = await this.prisma.dhikrHistory.findMany({
        where: {
            userId,
            date: { gte: lastWeek }
        },
        orderBy: { date: 'asc' }
    });

    return {
        totalDhikr: history._sum.count || 0,
        byPhrase: byPhrase.map(p => ({
            phraseArabic: p.phraseArabic,
            phraseEnglish: p.phraseEnglish,
            count: p._sum.count
        })),
        recentActivity
    };
  }
}
