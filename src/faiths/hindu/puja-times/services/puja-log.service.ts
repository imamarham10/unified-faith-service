import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { CreatePujaLogDto } from '../dto/create-puja-log.dto';

@Injectable()
export class PujaLogService {
  constructor(private prisma: PrismaService) {}

  async log(userId: string, dto: CreatePujaLogDto) {
    return this.prisma.pujaLog.create({
      data: {
        userId,
        sandhya: dto.sandhya,
        date: new Date(dto.date),
        status: dto.status,
      },
    });
  }

  async listLogs(userId: string, fromDate?: string, toDate?: string) {
    return this.prisma.pujaLog.findMany({
      where: {
        userId,
        ...(fromDate ? { date: { gte: new Date(fromDate) } } : {}),
        ...(toDate ? { date: { lte: new Date(toDate) } } : {}),
      },
      orderBy: { date: 'desc' },
    });
  }

  async deleteLog(userId: string, id: string) {
    const log = await this.prisma.pujaLog.findUnique({ where: { id } });
    if (!log || log.userId !== userId) {
      throw new NotFoundException('Puja log not found');
    }
    await this.prisma.pujaLog.delete({ where: { id } });
    return { deleted: true };
  }

  async getStats(userId: string) {
    const logs = await this.prisma.pujaLog.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });
    const total = logs.length;
    const onTime = logs.filter((l) => l.status === 'on_time').length;
    const late = logs.filter((l) => l.status === 'late').length;
    const missed = logs.filter((l) => l.status === 'missed').length;

    // Streak calculation: consecutive days with at least one non-missed log
    const dayKeys = new Set(
      logs
        .filter((l) => l.status !== 'missed')
        .map((l) => l.date.toISOString().slice(0, 10)),
    );
    let currentStreak = 0;
    let longestStreak = 0;
    let runningStreak = 0;

    // Iterate backwards from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (dayKeys.has(key)) {
        if (i === 0 || currentStreak === i) currentStreak = i + 1;
      } else if (i === 0) {
        // No log today — current streak still alive if yesterday had one
      } else {
        if (currentStreak === i) break;
      }
    }

    // Longest streak: scan all dayKeys sorted
    const sortedKeys = Array.from(dayKeys).sort();
    let prev: string | null = null;
    runningStreak = 0;
    for (const key of sortedKeys) {
      if (prev) {
        const prevDate = new Date(prev);
        const curDate = new Date(key);
        const diff = (curDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) runningStreak++;
        else runningStreak = 1;
      } else {
        runningStreak = 1;
      }
      longestStreak = Math.max(longestStreak, runningStreak);
      prev = key;
    }

    return {
      total,
      onTime,
      late,
      missed,
      currentStreak,
      longestStreak,
      completionRate: total > 0 ? Math.round((onTime / total) * 100) : 0,
    };
  }
}
