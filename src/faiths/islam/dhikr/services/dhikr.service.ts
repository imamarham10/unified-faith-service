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
    today.setHours(0, 0, 0, 0);

    return this.prisma.$transaction(async (tx) => {
      // 1. Update counter
      const updatedCounter = await tx.dhikrCounter.update({
        where: { id },
        data: { count: { increment: count } },
      });

      // 2. Update history
      await tx.dhikrHistory.upsert({
        where: {
          userId_phraseArabic_date: {
            userId: counter.userId,
            phraseArabic: counter.phraseArabic,
            date: today,
          },
        },
        update: {
          count: { increment: count },
        },
        create: {
          userId: counter.userId,
          phraseArabic: counter.phraseArabic,
          phraseTranslit: counter.phraseTranslit,
          phraseEnglish: counter.phraseEnglish,
          date: today,
          count: count,
        },
      });

      return updatedCounter;
    });
  }

  async deleteCounter(id: string) {
    return this.prisma.dhikrCounter.delete({
      where: { id },
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
      },
    });
  }

  async getGoals(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const goals = await this.prisma.dhikrGoal.findMany({
      where: {
        userId,
        endDate: { gte: today },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      goals.map(async (goal) => {
        // Determine the progress window
        let progressFrom: Date;
        if (goal.period === 'daily') {
          // Daily goal: only count today
          progressFrom = new Date(today);
        } else {
          // Weekly / monthly: count since the goal's startDate
          progressFrom = new Date(goal.startDate);
          progressFrom.setHours(0, 0, 0, 0);
        }

        const progressResult = await this.prisma.dhikrHistory.aggregate({
          where: {
            userId,
            phraseArabic: goal.phraseArabic,
            date: { gte: progressFrom },
          },
          _sum: { count: true },
        });

        const currentCount = progressResult._sum.count || 0;
        const progressPercent = Math.min(
          Math.round((currentCount / goal.targetCount) * 100),
          100,
        );

        const endDate = new Date(goal.endDate);
        endDate.setHours(23, 59, 59, 999);
        const msLeft = endDate.getTime() - today.getTime();
        const daysRemaining = Math.max(0, Math.ceil(msLeft / 86400000));

        return {
          ...goal,
          currentCount,
          progressPercent,
          daysRemaining,
          isComplete: currentCount >= goal.targetCount,
        };
      }),
    );
  }

  async getStats(userId: string) {
    // Total lifetime dhikr
    const historyAggregate = await this.prisma.dhikrHistory.aggregate({
      where: { userId },
      _sum: { count: true },
    });
    const totalCount = historyAggregate._sum.count || 0;

    // Counts grouped by phrase — ordered by most used
    const byPhrase = await this.prisma.dhikrHistory.groupBy({
      by: ['phraseArabic', 'phraseEnglish'],
      where: { userId },
      _sum: { count: true },
      orderBy: { _sum: { count: 'desc' } },
    });

    const mostRecitedPhrase = byPhrase.length > 0 ? (byPhrase[0].phraseEnglish || null) : null;

    // All history dates for streak + average calculation
    const allHistory = await this.prisma.dhikrHistory.findMany({
      where: { userId },
      select: { date: true },
      orderBy: { date: 'desc' },
    });

    // Daily average: total / unique active days
    const activeDays = allHistory.length;
    const dailyAverage = activeDays > 0 ? Math.round(totalCount / activeDays) : 0;

    // Streak calculation — build sorted unique date timestamps (ms, descending)
    const ONE_DAY = 86400000;
    let currentStreak = 0;
    let longestStreak = 0;

    if (allHistory.length > 0) {
      const rawTimestamps = allHistory.map((h) => {
        const d = new Date(h.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      });
      const uniqueDates = [...new Set(rawTimestamps)].sort((a, b) => b - a); // desc

      // Current streak: count from most recent date backwards if it's today or yesterday
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMs = today.getTime();
      const yesterdayMs = todayMs - ONE_DAY;

      if (uniqueDates[0] >= yesterdayMs) {
        currentStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          if (uniqueDates[i] === uniqueDates[i - 1] - ONE_DAY) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Longest streak: scan all consecutive runs
      let run = 1;
      longestStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        if (uniqueDates[i] === uniqueDates[i - 1] - ONE_DAY) {
          run++;
          if (run > longestStreak) longestStreak = run;
        } else {
          run = 1;
        }
      }
    }

    // Last 7 days activity
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const recentActivity = await this.prisma.dhikrHistory.findMany({
      where: { userId, date: { gte: lastWeek } },
      orderBy: { date: 'asc' },
    });

    return {
      totalCount,
      totalDhikr: totalCount, // backward-compat alias
      currentStreak,
      longestStreak,
      dailyAverage,
      mostRecitedPhrase,
      byPhrase: byPhrase.map((p) => ({
        phraseArabic: p.phraseArabic,
        phraseEnglish: p.phraseEnglish,
        count: p._sum.count || 0,
      })),
      recentActivity,
    };
  }

  async getHistory(userId: string, limit: number = 30) {
    return this.prisma.dhikrHistory.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }
}
