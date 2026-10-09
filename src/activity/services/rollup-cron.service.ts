import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/utils/prisma.service';
import { RollupService, addDays, toDayKey, toUtcMidnight } from './rollup.service';
import { FAITH_IDS, FaithId, isIanaZone, localDayIn } from '../dto/activity.dto';
import { activityError } from '../activity-errors';

/**
 * Task 1.7 — the nightly rollup.
 *
 * Frozen contract: `docs/contracts/activity-api.md` §2.8. Where this file and
 * that document disagree, the document is right and this file is a bug.
 *
 * ## What this job is, and what it is not
 *
 * It is a **cache warmer and a streak refresher**, not a source of truth.
 * Every read path already self-heals: `/today` runs `rebuildRecent` over a
 * trailing window (Task 1.8) and `/history` runs `rebuildRange` over the range
 * it was asked for, and §2.8 says outright that "any day not yet persisted is
 * computed on read and returned identically". Nothing a client sees depends on
 * this job having run.
 *
 * The one thing no read path covers is recovery of an **emptied**
 * `daily_rollups` table beyond `/today`'s window; that is `runFullRebuild`
 * below, reachable at `POST /api/v1/maintenance/activity/rebuild`.
 *
 * What it buys is the users who *don't* open the app: their closed days get
 * persisted and their `StreakState` stays current, which is what the Phase
 * 1.15 reminder and everything in Phase 3 will read. That framing is also why
 * the work per user is bounded (below) rather than complete — a cache that is
 * a week behind for a dormant user costs nothing, and an unbounded nightly
 * sweep across every account costs a Vercel timeout.
 *
 * ## §2.8's closure rule, which nothing implemented before this
 *
 * > A day D is closed once D has ended in the timezone carried by that day's
 * > own events [...] where a day carries several, the latest event's timezone
 * > governs. For a day with no events at all, the timezone of the user's most
 * > recent event before it governs, falling back to `UTC`.
 *
 * Implemented as a **day-string comparison, never as offset arithmetic**:
 *
 * ```
 * closed(D, zone) === localDayIn(zone, now) > D
 * ```
 *
 * "The current day in that zone has moved past D" is exactly "the end of D in
 * that zone has passed", it reuses the one helper (`localDayIn`) that the
 * read path already derives days with, and it introduces no new instant maths.
 * `rollup.service.ts`'s header is an essay on why computing with offsets is
 * how a user loses a streak they earned; this file does not reopen that.
 *
 * The rule matters because the cron fires on a **fixed IST schedule** and the
 * world has 38 UTC offsets. At one single instant, day D is long closed for a
 * user in `Pacific/Kiritimati` (UTC+14) and still hours from closing for one
 * in `Pacific/Niue` (UTC−11). Both are checked individually, per day, against
 * that day's own zone; the Niue user's open day is skipped and picked up on a
 * later night (or computed on read before that, by `/today`).
 *
 * ## The two rules Tasks 1.5 and 1.6 leave behind
 *
 *  1. **A persisted row does not mean a closed day.** `/today`'s
 *     `rebuildRecent` writes *today* — an open day — into `daily_rollups`,
 *     which it must,
 *     because the streak has to include today when it is met and
 *     `projectStreak` reads only persisted rows. So "a row exists" is useless
 *     as a skip signal, and this job never uses it as one: every closed day in
 *     the window is recomputed unconditionally. `computeDailyRollup` is a pure
 *     function of the event stream (Task 1.5's replay property), so recomputing
 *     is free of consequence — and it is also what picks up events that
 *     arrived late from an offline queue after the day had already closed.
 *  2. **Open days are left alone.** Writing today's row is `/today`'s job, at
 *     the moment a reader needs it. The cost is that a user who ingests events
 *     through `POST /events` without ever loading `/today` has a cached streak
 *     that lags by at most today — and that cache is recomputed on their next
 *     read anyway (§2.7, the server wins).
 *
 * ## Why the window is bounded, and at what
 *
 * Per (user, faith) this rebuilds `[userToday − ROLLUP_LOOKBACK_DAYS,
 * userToday]`, not the user's whole history. `rebuildAll` would reproduce
 * `/today`'s unbounded write problem across the entire user base, nightly,
 * inside a function with a platform execution limit.
 *
 * Seven days is: two for the 26-hour spread between the earliest and latest
 * zone closing the same calendar day, plus five nights of slack — GitHub's
 * scheduled runs are routinely minutes to tens of minutes late and are
 * sometimes dropped entirely, so a week of missed runs must still heal itself.
 * Anything older than the window is handled on read, which §2.8 explicitly
 * blesses.
 *
 * ## Why the endpoint pages
 *
 * This runs as a Vercel serverless function, which is killed at the platform
 * timeout. One invocation therefore takes a slice of the active pairs
 * (`limit`/`offset`) and also stops early on a wall-clock budget, checked
 * *after* each pair so a run always makes forward progress. The caller loops
 * on `hasMore`. A truncated run is visible in the summary rather than silent.
 */

/** The trailing window of days each (user, faith) is rebuilt over. */
export const ROLLUP_LOOKBACK_DAYS = 7;
/**
 * The largest `lookbackDays` an operator may ask the nightly job for.
 *
 * It used to be a bare `92`, which was one day **below**
 * `TODAY_REBUILD_WINDOW_DAYS` (93) — so there was a band of days that neither
 * the read path's bounded rebuild nor the biggest permitted cron run would
 * touch, and `rollup.service.ts`'s claim that recovery can go "through the
 * cron with a large `lookbackDays`" was false. A ceiling below the read window
 * is never the right number, and `rollup-cron.service.spec.ts` pins the
 * relationship so it cannot silently drift back.
 *
 * One year, not unbounded: this job sweeps *every* active pair, so its cost is
 * (pairs x lookbackDays) and an operator typing a large number here is asking
 * for a cross-user sweep. A year is ample for catching up after an extended
 * outage. Rebuilding a single account's whole history is `runFullRebuild`'s
 * job, where the scope can be narrowed to one user.
 */
export const ROLLUP_LOOKBACK_DAYS_MAX = 366;
/** (user, faith) pairs per invocation, before the wall-clock budget bites. */
export const ROLLUP_PAIR_LIMIT = 25;
export const ROLLUP_PAIR_LIMIT_MAX = 500;
/** Wall-clock budget for one invocation, well inside any serverless limit. */
export const ROLLUP_BUDGET_MS = 8_000;

/**
 * (user, faith) pairs per **full rebuild** invocation.
 *
 * An order of magnitude below `ROLLUP_PAIR_LIMIT` because the unit of work is
 * an order of magnitude larger: the nightly job rebuilds seven days per pair,
 * a full rebuild rebuilds every day the account has ever had.
 */
export const REBUILD_PAIR_LIMIT = 5;
export const REBUILD_PAIR_LIMIT_MAX = 100;

export interface RollupRunOptions {
  limit?: number;
  offset?: number;
  lookbackDays?: number;
  budgetMs?: number;
}

export interface RollupRunSummary {
  ranAt: string;
  lookbackDays: number;
  /** All (user, faith) pairs with activity in the window — the full job. */
  scannedPairs: number;
  offset: number;
  processedPairs: number;
  failedPairs: number;
  /** Days finalised because they had closed in their own zone (§2.8). */
  closedDays: number;
  /** Days inside the window still open in their own zone, left for `/today`. */
  openDaysSkipped: number;
  futureRowsDeleted: number;
  streaksRefreshed: number;
  nextOffset: number | null;
  hasMore: boolean;
  /** True when the wall-clock budget, not `limit`, ended the slice. */
  stoppedOnBudget: boolean;
  durationMs: number;
}

export interface RebuildRunOptions {
  limit?: number;
  offset?: number;
  budgetMs?: number;
  /** Narrow the sweep to one account, and optionally to one faith. */
  userId?: string;
  faithId?: FaithId;
  /** `YYYY-MM-DD`. Both present rebuilds exactly `[from, to]`. */
  from?: string;
  to?: string;
}

export interface RebuildRunSummary {
  ranAt: string;
  /** Echoed back so a paged run's scope is visible in every response. */
  scope: {
    userId: string | null;
    faithId: FaithId | null;
    from: string | null;
    to: string | null;
  };
  /** All (user, faith) pairs in scope — every pair that has ever had an event. */
  scannedPairs: number;
  offset: number;
  processedPairs: number;
  failedPairs: number;
  /** Rollup rows recomputed and written. */
  rebuiltDays: number;
  streaksRefreshed: number;
  nextOffset: number | null;
  hasMore: boolean;
  stoppedOnBudget: boolean;
  durationMs: number;
}

interface PairResult {
  closedDays: number;
  openDaysSkipped: number;
  futureRowsDeleted: number;
}

type EventRow = {
  localDay: Date | string;
  timezone: string | null;
  occurredAt: Date;
};

@Injectable()
export class RollupCronService {
  private readonly logger = new Logger(RollupCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rollups: RollupService,
  ) {}

  /**
   * The server's wall clock, as one overridable method.
   *
   * The same seam `ActivityReadService` carries, and for a stronger reason
   * here: every assertion about §2.8 is an assertion about *when* a day closes
   * in some zone, which cannot be made without choosing an instant. A seam
   * rather than jest's fake timers, which install the whole timer API and
   * leave the worker holding timers it has to force-exit over.
   */
  protected now(): Date {
    return new Date();
  }

  /**
   * Finalise every day that has closed, for every (user, faith) active in the
   * window, then refresh their streaks.
   */
  async runNightlyRollup(options: RollupRunOptions = {}): Promise<RollupRunSummary> {
    const startedAt = Date.now();
    const now = this.now();
    const lookbackDays = clamp(
      options.lookbackDays ?? ROLLUP_LOOKBACK_DAYS,
      1,
      ROLLUP_LOOKBACK_DAYS_MAX,
    );
    const limit = clamp(options.limit ?? ROLLUP_PAIR_LIMIT, 1, ROLLUP_PAIR_LIMIT_MAX);
    const offset = Math.max(0, Math.trunc(options.offset ?? 0));
    const budgetMs = clamp(options.budgetMs ?? ROLLUP_BUDGET_MS, 250, 60_000);

    const pairs = await this.activePairs(now, lookbackDays);
    const slice = pairs.slice(offset, offset + limit);

    const summary: RollupRunSummary = {
      ranAt: now.toISOString(),
      lookbackDays,
      scannedPairs: pairs.length,
      offset,
      processedPairs: 0,
      failedPairs: 0,
      closedDays: 0,
      openDaysSkipped: 0,
      futureRowsDeleted: 0,
      streaksRefreshed: 0,
      nextOffset: null,
      hasMore: false,
      stoppedOnBudget: false,
      durationMs: 0,
    };

    for (const pair of slice) {
      try {
        const result = await this.rollUpPair(pair.userId, pair.faithId, now, lookbackDays);
        summary.closedDays += result.closedDays;
        summary.openDaysSkipped += result.openDaysSkipped;
        summary.futureRowsDeleted += result.futureRowsDeleted;
        summary.streaksRefreshed += 1;
      } catch (error) {
        // One user's bad data must not cost every user behind them in the
        // slice their nightly rollup. The count surfaces in the summary and
        // the caller fails the job on it, so this is visible, not swallowed.
        summary.failedPairs += 1;
        this.logger.error(
          `Nightly rollup failed for ${pair.userId}/${pair.faithId}: ${(error as Error)?.message}`,
          (error as Error)?.stack,
        );
      }

      summary.processedPairs += 1;

      // Checked after the pair, never before: a budget that can stop a slice
      // at zero pairs is a job that never finishes.
      if (Date.now() - startedAt >= budgetMs) {
        summary.stoppedOnBudget = true;
        break;
      }
    }

    const consumed = offset + summary.processedPairs;
    summary.hasMore = consumed < pairs.length;
    summary.nextOffset = summary.hasMore ? consumed : null;
    summary.durationMs = Date.now() - startedAt;

    this.logger.log(
      `Nightly rollup: ${summary.processedPairs}/${summary.scannedPairs} pairs from offset ` +
        `${offset}, ${summary.closedDays} days closed, ${summary.openDaysSkipped} still open, ` +
        `${summary.futureRowsDeleted} future rows dropped, ${summary.failedPairs} failed ` +
        `(${summary.durationMs}ms)`,
    );

    return summary;
  }

  /**
   * Rebuild rollups from the event stream for every (user, faith) in scope,
   * then reproject their streaks. The operator entry point.
   *
   * ## Why this exists at all
   *
   * `rebuildAll` is the engine's recovery path — `rollup.service.ts` keeps it
   * unbounded precisely so an emptied `daily_rollups` table can be restored —
   * and until now **nothing in production called it**. `/today` calls
   * `rebuildRecent`, which restores only a 93-day trailing window, so a user
   * with a 400-day streak would come back as 93. The nightly job does not
   * cover the gap either: it enumerates pairs from `activity_events` with a
   * recent-activity floor, so a dormant account is never visited at all.
   * Recovery therefore took a one-off script per (user, faith). It does not
   * any more.
   *
   * ## Why it lives on the existing maintenance controller
   *
   * `af4a753` already put a shared-secret surface behind
   * `MaintenanceSecretGuard` at `/api/v1/maintenance/activity/`. A second
   * protected surface would be a second thing to get the guard wiring right
   * on; the class-level `@UseGuards` covers a new route for free.
   *
   * ## Scope, and the thing paging does not solve
   *
   * `limit`/`offset` and the wall-clock budget page across *pairs*, exactly as
   * `runNightlyRollup` does, and the budget is checked after each pair so a
   * run always makes forward progress. That bounds the number of accounts per
   * invocation — it does **not** bound a single account: a dormant two-year
   * account is ~730 `persistDailyRollup` calls inside one iteration and can
   * exhaust the platform execution limit on its own, with the budget check
   * never reached.
   *
   * Rather than add a second, day-level cursor to the paging protocol, the
   * scope is narrowable: pass `userId` (and optionally `faithId`) to rebuild
   * one account, and `from`/`to` to rebuild one slice of it. An operator
   * recovering a very old single account runs successive explicit ranges —
   * `from=2024-01-01&to=2024-06-30`, then the next half-year — which is two
   * query parameters instead of a stateful cursor the caller must thread, and
   * it is the same loop the GitHub workflow already runs for `hasMore`.
   * Without `from`, each pair is rebuilt from its first event through the
   * user's today, which is what a cold-table recovery wants and what the
   * replay spec covers.
   */
  async runFullRebuild(options: RebuildRunOptions = {}): Promise<RebuildRunSummary> {
    const startedAt = Date.now();
    const now = this.now();
    const limit = clamp(options.limit ?? REBUILD_PAIR_LIMIT, 1, REBUILD_PAIR_LIMIT_MAX);
    const offset = Math.max(0, Math.trunc(options.offset ?? 0));
    const budgetMs = clamp(options.budgetMs ?? ROLLUP_BUDGET_MS, 250, 60_000);

    // A malformed range is rejected rather than clamped away. Every other
    // option degrades to a default because a nonsense value there costs a
    // suboptimal run; silently dropping `from` turns a deliberately narrow
    // rebuild into a sweep of the user's entire history.
    const from = requireDay(options.from, 'from');
    const to = requireDay(options.to, 'to');
    if (from && to && from > to) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'invalid_range',
        '`from` must not be after `to`',
      );
    }
    if (to && !from) {
      // A bare `to` would read as a narrowing but do nothing: the no-range
      // branch replays from the account's first event regardless. Refusing it
      // is the same principle as refusing a malformed `from` — a scope the
      // summary echoes back must be a scope that was actually applied.
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'invalid_range',
        '`to` requires `from`; a full rebuild already ends at the user\'s today',
      );
    }
    if (options.faithId && !FAITH_IDS.includes(options.faithId)) {
      throw activityError(HttpStatus.BAD_REQUEST, 'invalid_faith', 'Unknown `faithId`');
    }

    const pairs = await this.allPairs(options.userId, options.faithId);
    const slice = pairs.slice(offset, offset + limit);

    const summary: RebuildRunSummary = {
      ranAt: now.toISOString(),
      scope: {
        userId: options.userId ?? null,
        faithId: options.faithId ?? null,
        from: from ?? null,
        to: to ?? null,
      },
      scannedPairs: pairs.length,
      offset,
      processedPairs: 0,
      failedPairs: 0,
      rebuiltDays: 0,
      streaksRefreshed: 0,
      nextOffset: null,
      hasMore: false,
      stoppedOnBudget: false,
      durationMs: 0,
    };

    for (const pair of slice) {
      try {
        const userToday = await this.userToday(pair.userId, now);
        const upper = to && to < userToday ? to : userToday;

        if (from) {
          // An explicit range, floored at the pair's first event day for the
          // reason `rebuildSince` floors its own: `rebuildRange` is dense, so
          // a `from` predating the account would write a year of empty
          // `goalMet: false` rows for days the user did not exist on.
          const start = await this.firstEventDay(pair.userId, pair.faithId, from);
          if (start && start <= upper) {
            const written = await this.rollups.rebuildRange(
              pair.userId,
              pair.faithId,
              start,
              upper,
            );
            summary.rebuiltDays += written.length;
          }
          await this.rollups.projectStreak(pair.userId, pair.faithId, userToday);
        } else {
          // The whole history, from the pair's first event through today.
          // `rebuildAll` projects the streak itself — and this is the first
          // production caller it has ever had.
          await this.rollups.rebuildAll(pair.userId, pair.faithId, userToday);
          summary.rebuiltDays += await this.countRollups(pair.userId, pair.faithId);
        }
        summary.streaksRefreshed += 1;
      } catch (error) {
        // One account's bad data must not cost every account behind it in the
        // slice its rebuild. Counted in the summary, which the caller fails on.
        summary.failedPairs += 1;
        this.logger.error(
          `Full rebuild failed for ${pair.userId}/${pair.faithId}: ${(error as Error)?.message}`,
          (error as Error)?.stack,
        );
      }

      summary.processedPairs += 1;

      // After the pair, never before: a budget that can stop a slice at zero
      // pairs is a job that never finishes.
      if (Date.now() - startedAt >= budgetMs) {
        summary.stoppedOnBudget = true;
        break;
      }
    }

    const consumed = offset + summary.processedPairs;
    summary.hasMore = consumed < pairs.length;
    summary.nextOffset = summary.hasMore ? consumed : null;
    summary.durationMs = Date.now() - startedAt;

    this.logger.log(
      `Full rebuild: ${summary.processedPairs}/${summary.scannedPairs} pairs from offset ` +
        `${offset}, ${summary.rebuiltDays} days rebuilt, ${summary.failedPairs} failed ` +
        `(${summary.durationMs}ms)`,
    );

    return summary;
  }

  /**
   * Rollup rows currently persisted for a pair — the `rebuiltDays` gauge.
   *
   * `count`, not `findMany().length`: this runs in the one code path built for
   * the largest accounts, and dragging two years of rows across the wire to
   * populate a summary number is the same mistake Prisma's unpushed `take`
   * made in `prayers.service.ts`.
   */
  private async countRollups(userId: string, faithId: FaithId): Promise<number> {
    return this.prisma.dailyRollup.count({ where: { userId, faithId } });
  }

  /** `max(requested, the pair's first event day)`, or null if it has none. */
  private async firstEventDay(
    userId: string,
    faithId: FaithId,
    requested: string,
  ): Promise<string | null> {
    const first = await this.prisma.activityEvent.findFirst({
      where: { userId, faithId },
      orderBy: { localDay: 'asc' },
    });
    if (!first) return null;
    const firstDay = toDayKey(first.localDay);
    return requested > firstDay ? requested : firstDay;
  }

  /**
   * **Every** (user, faith) pair that has ever had an event, optionally
   * narrowed to one account.
   *
   * Deliberately without `activePairs`' recent-activity floor: a dormant
   * account is exactly the one a full rebuild exists for. Enumerating from
   * `activity_events` is still complete for recovery — a pair with no event
   * has no rollup that a replay could produce, so there is nothing to restore.
   */
  private async allPairs(
    userId?: string,
    faithId?: FaithId,
  ): Promise<{ userId: string; faithId: FaithId }[]> {
    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (faithId) where.faithId = faithId;

    const groups = await this.prisma.activityEvent.groupBy({
      by: ['userId', 'faithId'],
      where,
      orderBy: [{ userId: 'asc' }, { faithId: 'asc' }],
    });

    return groups.map((group: { userId: string; faithId: string }) => ({
      userId: group.userId,
      faithId: group.faithId as FaithId,
    }));
  }

  /**
   * The calendar day it is right now where the user last was.
   *
   * Scoped to the user and ordered by `occurredAt`, matching `rollUpPair` and
   * `ActivityReadService.resolveGoalTimezone` — which zone a person is in is a
   * fact about where they are standing, not about a content pack.
   */
  private async userToday(userId: string, now: Date): Promise<string> {
    const latest = await this.prisma.activityEvent.findFirst({
      where: { userId },
      orderBy: { occurredAt: 'desc' },
    });
    return localDayIn(zoneOf(latest) ?? 'UTC', now);
  }

  /**
   * The (user, faith) pairs the job is responsible for tonight.
   *
   * Scoped to recent activity rather than to every account that has ever
   * existed. A pair with no event in the window has no day inside the window
   * that could become goal-met, so there is nothing to finalise; its streak is
   * recomputed on its owner's next read, which is the only place Phase 1
   * observes it.
   *
   * The floor is padded by one day beyond the window because `localDay` is
   * device-stamped and §2.2 lets it sit ±1 day from the event's UTC date.
   */
  private async activePairs(
    now: Date,
    lookbackDays: number,
  ): Promise<{ userId: string; faithId: FaithId }[]> {
    const floor = toUtcMidnight(addDays(localDayIn('UTC', now), -(lookbackDays + 1)));

    const groups = await this.prisma.activityEvent.groupBy({
      by: ['userId', 'faithId'],
      where: { localDay: { gte: floor } },
      orderBy: [{ userId: 'asc' }, { faithId: 'asc' }],
    });

    return groups.map((group: { userId: string; faithId: string }) => ({
      userId: group.userId,
      faithId: group.faithId as FaithId,
    }));
  }

  /** Finalise one (user, faith)'s closed days and reproject its streak. */
  private async rollUpPair(
    userId: string,
    faithId: FaithId,
    now: Date,
    lookbackDays: number,
  ): Promise<PairResult> {
    // The zone the *user* is currently in, used only to decide which calendar
    // days are even candidates. Each day's own closure is judged separately,
    // against that day's own events, below.
    const userToday = await this.userToday(userId, now);
    const windowFrom = addDays(userToday, -lookbackDays);

    // Zone resolution is scoped to the user, not to the faith: which zone a
    // person is in is a fact about where they are standing, not about which
    // content pack the event belongs to. `ActivityReadService.resolveGoalTimezone`
    // already answers the same question the same way, and orders by
    // `occurredAt` for the reason §2.8 gives — two events on one `localDay`
    // from different zones (a user mid-flight) must resolve identically in
    // both places.
    const windowEvents = (await this.prisma.activityEvent.findMany({
      where: { userId, localDay: { gte: toUtcMidnight(windowFrom) } },
      orderBy: { occurredAt: 'asc' },
    })) as EventRow[];

    // §2.8's second fallback: for a day with no events, the user's most recent
    // event *before* it governs. One query, not one per empty day.
    const beforeWindow = await this.prisma.activityEvent.findFirst({
      where: { userId, localDay: { lt: toUtcMidnight(windowFrom) } },
      orderBy: { occurredAt: 'desc' },
    });
    const priorZone = zoneOf(beforeWindow) ?? 'UTC';

    const result: PairResult = { closedDays: 0, openDaysSkipped: 0, futureRowsDeleted: 0 };

    for (let day = windowFrom; day <= userToday; day = addDays(day, 1)) {
      const zone = this.resolveDayZone(day, windowEvents, priorZone);
      if (localDayIn(zone, now) <= day) {
        // Still open in its own zone. Not this job's to write — see the header.
        result.openDaysSkipped += 1;
        continue;
      }
      await this.rollups.persistDailyRollup(userId, faithId, day);
      result.closedDays += 1;
    }

    result.futureRowsDeleted = await this.dropFutureRollups(userId, faithId, userToday);

    // Reprojected from whatever is persisted, including any open-today row
    // `/today` wrote earlier. `projectStreak` filters met days to `<= today`
    // itself, so this is consistent with the deletion above either way.
    await this.rollups.projectStreak(userId, faithId, userToday);

    return result;
  }

  /**
   * §2.8 — the zone that governs day D.
   *
   * The latest event *on* D, then the latest event *before* D, then the zone
   * carried into the window, then UTC. "Latest" is by `occurredAt`, which is
   * the real instant; `localDay` is a device-stamped calendar date and two
   * events on one `localDay` can straddle a flight.
   */
  private resolveDayZone(day: string, eventsAsc: EventRow[], priorZone: string): string {
    let onDay: string | null = null;
    let before: string | null = null;

    // `eventsAsc` is ascending by `occurredAt`, so the last match wins in both
    // branches. It is not safe to break early: `occurredAt` order and
    // `localDay` order can disagree by up to a day (§2.2).
    for (const event of eventsAsc) {
      const eventDay = toDayKey(event.localDay);
      const zone = zoneOf(event);
      if (!zone) continue;
      if (eventDay === day) onDay = zone;
      else if (eventDay < day) before = zone;
    }

    return onDay ?? before ?? priorZone;
  }

  /**
   * Drop rollup rows for days that have not happened yet.
   *
   * `/history` persists its whole requested window, so a client asking for a
   * range ending in the future leaves rows for days that have not occurred.
   * `projectStreak` filters met days to `<= today`, so streaks were never at
   * risk — but the table is not clean, and the real hazard is not the streak:
   * a future day's row carries a `goalMet` computed against the goal that was
   * in force when the request happened, and when that day actually arrives a
   * stale `false` is sitting there for any reader that trusts persisted rows
   * (including this job's own `projectStreak`, for a user who never opens the
   * app). Deleting them removes that case entirely, and costs nothing: the
   * model's own comment calls every row deletable and recomputable, and the
   * trailing window recomputes the day properly once it is genuinely past.
   */
  private async dropFutureRollups(
    userId: string,
    faithId: FaithId,
    userToday: string,
  ): Promise<number> {
    const deleted = await this.prisma.dailyRollup.deleteMany({
      where: { userId, faithId, localDay: { gt: toUtcMidnight(userToday) } },
    });
    return deleted?.count ?? 0;
  }
}

/** A usable IANA zone off an event row, or null. §2.2 stores zones unvalidated. */
function zoneOf(event: { timezone?: string | null } | null | undefined): string | null {
  const zone = event?.timezone;
  return typeof zone === 'string' && isIanaZone(zone) ? zone : null;
}

/** A real `YYYY-MM-DD`, or `undefined` when absent. Anything else is a 400. */
function requireDay(value: string | undefined, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    throw activityError(
      HttpStatus.BAD_REQUEST,
      'invalid_day',
      `\`${field}\` must be a YYYY-MM-DD calendar date`,
    );
  }
  return value;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
