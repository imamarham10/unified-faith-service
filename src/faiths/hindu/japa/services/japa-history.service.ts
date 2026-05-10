import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';

@Injectable()
export class JapaHistoryService {
  constructor(private prisma: PrismaService) {}

  async listHistory(userId: string) {
    return this.prisma.japaHistory.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 90,
    });
  }

  async getStats(userId: string) {
    const history = await this.prisma.japaHistory.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    const totalCount = history.reduce((sum, h) => sum + h.count, 0);

    // Group by day
    const byDay = new Map<string, number>();
    for (const h of history) {
      const key = h.date.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + h.count);
    }

    const dayCount = byDay.size;
    const dailyAverage = dayCount > 0 ? Math.round(totalCount / dayCount) : 0;

    // Streaks
    const sortedKeys = Array.from(byDay.keys()).sort();
    let longestStreak = 0;
    let runningStreak = 0;
    let prev: string | null = null;
    for (const key of sortedKeys) {
      if (prev) {
        const prevDate = new Date(prev);
        const curDate = new Date(key);
        const diff = (curDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        runningStreak = diff === 1 ? runningStreak + 1 : 1;
      } else {
        runningStreak = 1;
      }
      longestStreak = Math.max(longestStreak, runningStreak);
      prev = key;
    }

    // Current streak: count consecutive days ending today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (byDay.has(key)) currentStreak++;
      else if (i > 0) break;
    }

    // Most recited mantra
    const byMantra = new Map<string, number>();
    for (const h of history) {
      byMantra.set(h.mantra, (byMantra.get(h.mantra) ?? 0) + h.count);
    }
    const mostRecitedPhrase = Array.from(byMantra.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return { totalCount, dailyAverage, currentStreak, longestStreak, mostRecitedPhrase };
  }
}
