import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { PrayerCalculationsService } from './prayer-calculations.service';

const PRAYER_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

@Injectable()
export class PrayersService {
  constructor(
    private prisma: PrismaService,
    private prayerCalculations: PrayerCalculationsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getPrayerTimes(lat: number, lng: number, dateStr?: string, method: string = 'mwl') {
    // Round coordinates to 4 decimal places for cache key consistency
    const latKey = lat.toFixed(4);
    const lngKey = lng.toFixed(4);
    const dateKey = dateStr || new Date().toISOString().split('T')[0];
    const cacheKey = `prayers:${latKey}:${lngKey}:${dateKey}:${method}`;

    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    // Parse YYYY-MM-DD into local date components. `new Date('YYYY-MM-DD')`
    // is UTC midnight, and adhan reads the date's *local* components — on any
    // server west of UTC that yields the previous day's times.
    const date = dateStr ? this.parseLocalDate(dateStr) : new Date();
    if (!date || isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const times = this.prayerCalculations.calculatePrayerTimes(lat, lng, date, method);

    const result = {
      date: date.toISOString().split('T')[0],
      location: { lat, lng },
      method,
      times: {
        fajr: times.fajr.toISOString(),
        sunrise: times.sunrise.toISOString(),
        dhuhr: times.dhuhr.toISOString(),
        asr: times.asr.toISOString(),
        maghrib: times.maghrib.toISOString(),
        isha: times.isha.toISOString(),
      },
    };

    await this.cacheManager.set(cacheKey, result, PRAYER_CACHE_TTL);
    return result;
  }

  async getCurrentPrayer(lat: number, lng: number, method: string = 'mwl') {
    const date = new Date();
    const result = this.prayerCalculations.getCurrentPrayer(lat, lng, date, method);
    
    return {
      current: result.current,
      next: result.next,
      date: date.toISOString(),
      remainingTime: result.next ? this.calculateTimeDifference(new Date(), result.times[result.next]) : null
    };
  }

  async logPrayer(userId: string, data: { prayerName: string; date: string; status: string }) {
    const prayerDate = new Date(data.date);
    
    return this.prisma.prayerLog.upsert({
      where: {
        userId_prayerName_date: {
          userId,
          prayerName: data.prayerName,
          date: prayerDate,
        },
      },
      update: {
        status: data.status,
        loggedAt: new Date(),
      },
      create: {
        userId,
        prayerName: data.prayerName,
        date: prayerDate,
        status: data.status,
        loggedAt: new Date(),
      },
    });
  }

  async getPrayerLogs(userId: string, fromDate?: string, toDate?: string, date?: string) {
    const where: any = { userId };

    // Single-day filter (mobile sends `?date=YYYY-MM-DD`); takes precedence
    // over the range params when both are present.
    if (date) {
      const day = new Date(date);
      if (isNaN(day.getTime())) {
        throw new BadRequestException('Invalid date format');
      }
      const next = new Date(day);
      next.setUTCDate(next.getUTCDate() + 1);
      where.date = { gte: day, lt: next };
    } else if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    return this.prisma.prayerLog.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100
    });
  }

  /** Current qada tallies for a user, keyed by prayer. */
  async getQadaCounts(userId: string) {
    const rows = await this.prisma.prayerQadaCount.findMany({ where: { userId } });
    const byPrayer: Record<string, number> = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
    for (const row of rows) {
      byPrayer[row.prayerName] = row.count;
    }
    const total = Object.values(byPrayer).reduce((a, b) => a + b, 0);
    return { total, totalQaza: total, byPrayer };
  }

  /**
   * Adjust the standalone qada tally. Deliberately independent of PrayerLog:
   * a qada owed for a *past* day must never upsert over today's log row.
   * Count is clamped at zero on decrement.
   */
  async adjustQada(userId: string, prayerName: string, by: number = 1) {
    if (!Number.isInteger(by) || Math.abs(by) > 100 || by === 0) {
      throw new BadRequestException('`by` must be a non-zero integer between -100 and 100');
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.prayerQadaCount.findUnique({
        where: { userId_prayerName: { userId, prayerName } },
      });
      const next = Math.max(0, (existing?.count ?? 0) + by);
      await tx.prayerQadaCount.upsert({
        where: { userId_prayerName: { userId, prayerName } },
        update: { count: next },
        create: { userId, prayerName, count: next },
      });
    });

    return this.getQadaCounts(userId);
  }

  async deletePrayerLog(userId: string, logId: string) {
    // Verify ownership before deleting
    const log = await this.prisma.prayerLog.findFirst({
      where: { id: logId, userId },
    });

    if (!log) {
      throw new BadRequestException('Prayer log not found');
    }

    return this.prisma.prayerLog.delete({
      where: { id: logId },
    });
  }

  async getPrayerStats(userId: string) {
    const totalPrayers = await this.prisma.prayerLog.count({
      where: { userId }
    });

    const onTimePrayers = await this.prisma.prayerLog.count({
      where: { userId, status: 'on_time' }
    });

    // Simple streak calculation (consecutive days with at least one prayer logged)
    // This is a simplified version; real streak logic can be more complex
    const logs = await this.prisma.prayerLog.findMany({
      where: { userId },
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'desc' },
      take: 30
    });

    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Check if we have a log for today or yesterday to start counting
    if (logs.length > 0) {
        let currentDate = new Date(logs[0].date);
        const timeDiff = today.getTime() - currentDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        
        if (daysDiff <= 1) { // Logged today or yesterday
             streak = 1;
             for (let i = 0; i < logs.length - 1; i++) {
                 const curr = new Date(logs[i].date);
                 const prev = new Date(logs[i+1].date);
                 const diff = (curr.getTime() - prev.getTime()) / (1000 * 3600 * 24);
                 if (Math.round(diff) === 1) {
                     streak++;
                 } else {
                     break;
                 }
             }
        }
    }

    // Qada tallies — additive fields so the mobile client's stats parser
    // (flat keys / byPrayer / totalQaza) resolves without breaking web.
    const qada = await this.getQadaCounts(userId);

    return {
      userId,
      totalPrayers,
      onTimePrayers,
      streak,
      totalQaza: qada.totalQaza,
      byPrayer: qada.byPrayer,
    };
  }

  /** Parse 'YYYY-MM-DD' into a Date at *server-local* midnight (adhan reads local components). */
  private parseLocalDate(dateStr: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
    if (!match) return null;
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  private calculateTimeDifference(now: Date, target: Date | undefined): string | null {
      if (!target) return null;
      const diffMs = target.getTime() - now.getTime();
      if (diffMs < 0) return '00:00:00'; // Passed
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
