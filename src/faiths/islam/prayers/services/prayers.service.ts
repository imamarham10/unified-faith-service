import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { PrayerCalculationsService } from './prayer-calculations.service';
import { daysBetween, toDayKey } from '../../../../activity/services/rollup.service';

const PRAYER_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

/**
 * The `prayer_logs.status` values that mean "the user prayed on this day".
 *
 * `missed` is a logged *absence*: the row exists precisely to record that the
 * prayer was not performed. `qada` is a prayer owed from **another** day,
 * stamped with the date it was made up on — crediting the streak for it would
 * credit today with yesterday's obligation, and the mobile client excludes it
 * from both the daily goal and its on-device streak. The two must agree or the
 * same screen shows two different numbers.
 *
 * This is the denominator of **every** number in `getPrayerStats` that claims
 * to be a count of prayers, not just the streak. A `missed` row is not a
 * prayer; a `qada` row is a prayer that belongs to a different day and is
 * already reported separately as `totalQaza`.
 */
const PRAYED_STATUSES = ['on_time', 'late'] as const;

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
    // `totalPrayers` is **prayers performed**, and `onTimePrayers` is the
    // subset of those performed inside their window. The two are one pair, and
    // the pair is the point: the client renders them side by side ("Total
    // Prayers" / "On Time") and the only honest reading of that pair is a
    // punctuality ratio over the same population.
    //
    // It used to count every row with no status filter, so `missed` — a logged
    // *absence* — and `qada` — a prayer owed from another day — were reported
    // as prayers performed. That inflated the denominator while the numerator
    // stayed strictly on-time, which made `onTime/total` wrong in both
    // directions at once: the total flattered the user and the ratio punished
    // them. Same class of bug as the streak's missing filter (ee28410).
    //
    // Nothing is lost by the exclusion: `totalQaza` and `byPrayer` below still
    // report the qada tally, and missed prayers remain readable from
    // `GET /logs`.
    const totalPrayers = await this.prisma.prayerLog.count({
      where: { userId, status: { in: [...PRAYED_STATUSES] } }
    });

    const onTimePrayers = await this.prisma.prayerLog.count({
      where: { userId, status: 'on_time' }
    });

    // Consecutive days on which the user actually prayed.
    //
    // The status filter is load-bearing and its absence was a real bug: a day
    // whose only row was `missed` used to count as a day the user practised,
    // so the streak was inflated — and inflated in the direction that flatters
    // the user, which is the one direction a practice app must not be wrong
    // in. `qada` is excluded for a different reason; see PRAYED_STATUSES.
    const logs = await this.prisma.prayerLog.findMany({
      where: { userId, status: { in: [...PRAYED_STATUSES] } },
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'desc' },
      take: 30
    });

    // Rows become `YYYY-MM-DD` keys before anything compares them, and the
    // reference day is the **UTC** calendar day — the one `@db.Date` round-
    // trips through and the one `logPrayer` writes. See `countStreak`.
    const streak = countStreak(
      logs.map((log) => toDayKey(log.date)),
      toDayKey(new Date()),
    );

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

/**
 * Consecutive calendar days ending today or yesterday, from a descending,
 * already-deduplicated list of `YYYY-MM-DD` day keys.
 *
 * ## Why this compares day strings and not instants
 *
 * The streak used to build its reference day as `new Date(); setHours(0,0,0,0)`
 * — **server-local** midnight — and subtract it from `prayer_logs.date`, which
 * is `@db.Date` and comes back from Prisma as a `Date` at **UTC** midnight.
 * Two different midnights subtracted from each other: the remainder is the
 * runtime's UTC offset, and `Math.floor(ms / 86_400_000)` turns any non-zero
 * offset into an off-by-one day.
 *
 * It has never misbehaved in production, and that is luck rather than design.
 * Nothing in this repository pins the runtime timezone — there is no `TZ` in
 * `vercel.json`, in `api/index.ts`, or anywhere else; Vercel's Node runtime
 * simply happens to default to UTC. A region change, a platform default
 * change, or anyone running this on a machine east of Greenwich shifts the
 * comparison by a day and silently resets or extends every user's streak. On
 * an IST host, a run whose most recent prayed day was *two* days ago still
 * reads as alive.
 *
 * `rollup.service.ts`'s header is an essay on exactly this failure, and its
 * conclusion is reused rather than re-derived: **compare `YYYY-MM-DD` strings,
 * never instants.** `toDayKey` and `daysBetween` are imported from it, so
 * there is no third date helper in this codebase.
 *
 * ## The lower bound, and why it is a filter rather than a `>= 0`
 *
 * The old gate was `daysDiff <= 1` with no floor, so a log dated in the future
 * passed it — nothing in `prayer_logs` forbids one, and `logPrayer` upserts
 * whatever date the client hands it. Adding `daysDiff >= 0` would zero the
 * streak outright for a user who has one stray future row *and* a healthy run,
 * because that row would be the anchor the gate rejects. Future days are
 * dropped first and the gate runs on what is left, which is what
 * `RollupService.projectStreak` does (`.filter((day) => day <= today)`) for
 * exactly the same reason.
 */
export function countStreak(daysDesc: string[], today: string): number {
  const days = daysDesc.filter((day) => day <= today);
  if (!days.length || daysBetween(days[0], today) > 1) return 0;

  let streak = 1;
  for (let i = 0; i < days.length - 1; i += 1) {
    if (daysBetween(days[i + 1], days[i]) !== 1) break;
    streak += 1;
  }
  return streak;
}
