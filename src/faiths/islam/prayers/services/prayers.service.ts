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

    const date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) {
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

  async getPrayerLogs(userId: string, fromDate?: string, toDate?: string) {
    const where: any = { userId };
    
    if (fromDate || toDate) {
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

    return {
      userId,
      totalPrayers,
      onTimePrayers,
      streak,
    };
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
