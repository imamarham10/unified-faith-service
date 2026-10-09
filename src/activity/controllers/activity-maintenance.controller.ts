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
import { RollupCronService, RollupRunSummary } from '../services/rollup-cron.service';

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
}

/** `undefined` for anything that is not an integer, so the service default wins. */
function toInt(value?: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}
