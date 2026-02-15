import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { PrayerCalculationsService } from './prayer-calculations.service';

@Injectable()
export class PrayersService {
  constructor(
    private prisma: PrismaService,
    private prayerCalculations: PrayerCalculationsService,
  ) {}

  async getPrayerTimes(lat: number, lng: number, dateStr?: string, method: string = 'mwl') {
    const date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const times = this.prayerCalculations.calculatePrayerTimes(lat, lng, date, method);

    return {
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
      if (toDate) where.date.lte = new Date(toDate);
    }

    return this.prisma.prayerLog.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100
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
