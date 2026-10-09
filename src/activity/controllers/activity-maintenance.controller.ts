import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ActivityExceptionFilter } from '../activity-errors';
import { MaintenanceSecretGuard } from '../guards/maintenance-secret.guard';
import {
  RebuildRunSummary,
  RollupCronService,
  RollupRunSummary,
} from '../services/rollup-cron.service';
import { FaithId } from '../dto/activity.dto';

/**
 * Operator endpoints for the retention engine. Called by machines, never by
 * the app.
 *
 * ## Why this is its own controller, on its own path
 *
 * `ActivityController` carries `@UseGuards(JwtAuthGuard)` at the class level
 * and the contract it implements is **frozen at four endpoints**. A fifth
 * route there would read as a contract change even with the document
 * untouched, and would have to opt out of the class guard to work at all —
 * `@Public()` plus a secret guard is a combination it takes one careless edit
 * to get wrong. A separate controller under `/api/v1/maintenance/` has no JWT
 * guard to escape and leaves `/api/v1/activity/` exactly the four endpoints
 * §4–§7 describe.
 *
 * `ActivityExceptionFilter` is reused so a rejected call answers in §3's
 * `{statusCode, message, code}` shape like the rest of the module.
 */
@Controller('api/v1/maintenance/activity')
@UseGuards(MaintenanceSecretGuard)
@UseFilters(ActivityExceptionFilter)
export class ActivityMaintenanceController {
  constructor(private readonly cron: RollupCronService) {}

  /**
   * `POST /api/v1/maintenance/activity/rollup`
   *
   * Finalises every day that has closed in its own timezone (§2.8) for the
   * (user, faith) pairs active in the trailing window, refreshes their streak
   * state, and drops rollup rows for days that have not happened yet.
   *
   * POST rather than GET: it writes. It is nonetheless idempotent — rerunning
   * it recomputes the same days to the same values — which is what makes it
   * safe for the caller to retry and safe for GitHub to fire late.
   *
   * ### Paging
   *
   * One invocation takes `limit` pairs from `offset` and also stops on a
   * wall-clock budget, because this runs as a serverless function with a
   * platform execution limit. The response carries `hasMore` and `nextOffset`;
   * the workflow loops until `hasMore` is false. A run that is cut short says
   * so rather than silently covering a prefix of the user base.
   *
   * Query parameters are read one at a time and parsed here rather than
   * through a DTO, for the reason `ActivityController` gives: the global
   * `ValidationPipe` in `main.ts` runs before any controller-scoped one and
   * would throw its own error shape. Every value is clamped to a sane range by
   * the service, so a nonsense query string degrades to the defaults instead
   * of failing the night's run.
   */
  @Post('rollup')
  @HttpCode(HttpStatus.OK)
  async rollup(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('lookbackDays') lookbackDays?: string,
    @Query('budgetMs') budgetMs?: string,
  ): Promise<RollupRunSummary> {
    return this.cron.runNightlyRollup({
      limit: toInt(limit),
      offset: toInt(offset),
      lookbackDays: toInt(lookbackDays),
      budgetMs: toInt(budgetMs),
    });
  }

  /**
   * `POST /api/v1/maintenance/activity/rebuild`
   *
   * Replays `daily_rollups` from `activity_events` and reprojects streaks. The
   * recovery path for a dropped or corrupted rollup cache.
   *
   * ### Why it is not the `rollup` route with a big `lookbackDays`
   *
   * Two different jobs. `rollup` finalises **closed days only**, over a
   * trailing window, for pairs with **recent activity** — so a dormant account
   * is never visited however large the window, and today is deliberately left
   * for `/today` to write. This one visits every pair that has ever had an
   * event and rebuilds unconditionally. Recovering a cold `daily_rollups`
   * table previously meant a one-off script per (user, faith); it is now this.
   *
   * ### Scope and paging — read before running it across the user base
   *
   * `limit`/`offset` plus a wall-clock budget page across *pairs*, and the
   * response carries `hasMore`/`nextOffset` for the caller to loop on, exactly
   * like `rollup`. That bounds accounts per invocation; it does **not** bound
   * one account. A dormant two-year account is ~730 day-rebuilds inside a
   * single iteration and can exhaust the platform execution limit before the
   * budget is ever checked.
   *
   * For such an account, narrow the scope instead of raising the limit:
   *
   *     POST .../rebuild?userId=<id>&from=2024-01-01&to=2024-06-30
   *     POST .../rebuild?userId=<id>&from=2024-07-01&to=2024-12-31
   *
   * `from`/`to` are `YYYY-MM-DD` and are rejected rather than clamped if
   * malformed, because silently dropping a range would turn a deliberately
   * narrow rebuild into a sweep of the account's whole history. `to` without
   * `from` is rejected for the same reason: it would look like a narrowing,
   * be echoed back in `scope`, and change nothing. Every other parameter still
   * degrades to its default, as on `rollup`.
   *
   * `to` is capped at the user's own today — a rollup for a day that has not
   * happened yet is the stale-`goalMet` hazard `dropFutureRollups` exists to
   * clean up, and this route must not create it — and `from` is floored at the
   * account's first event day, so an over-wide range cannot write empty rows
   * for days before the user existed.
   */
  @Post('rebuild')
  @HttpCode(HttpStatus.OK)
  async rebuild(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('budgetMs') budgetMs?: string,
    @Query('userId') userId?: string,
    @Query('faithId') faithId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<RebuildRunSummary> {
    return this.cron.runFullRebuild({
      limit: toInt(limit),
      offset: toInt(offset),
      budgetMs: toInt(budgetMs),
      userId: toText(userId),
      faithId: toText(faithId) as FaithId | undefined,
      from: toText(from),
      to: toText(to),
    });
  }
}

/** `undefined` for an absent or blank value, so the service's default wins. */
function toText(value?: string): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

/** `undefined` for anything that is not an integer, so the service default wins. */
function toInt(value?: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}
