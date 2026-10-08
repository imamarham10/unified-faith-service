import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ActivityService } from '../services/activity.service';
import { ActivityReadService } from '../services/activity-read.service';
import {
  BATCH_MAX,
  BATCH_MIN,
  GoalResponse,
  HistoryResponse,
  IngestEventsDto,
  IngestResult,
  SetGoalDto,
  TodayResponse,
} from '../dto/activity.dto';
import {
  ActivityExceptionFilter,
  activityError,
  activityValidationExceptionFactory,
} from '../activity-errors';
import { JwtAuthGuard } from '../../auth-service/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../../auth-service/decorators/current-user.decorator';

/**
 * The activity write path (contract §4).
 *
 * `main.ts` sets no global prefix, so the controller carries the full path —
 * the convention the Islam and Hindu controllers already follow.
 *
 * Everything leaving this controller passes through ActivityExceptionFilter so
 * that §3's `{statusCode, message, code}` shape holds, including for the
 * shared JwtAuthGuard's 401, which otherwise carries no machine-readable code.
 */
@Controller('api/v1/activity')
@UseGuards(JwtAuthGuard)
@UseFilters(ActivityExceptionFilter)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: activityValidationExceptionFactory,
  }),
)
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly readService: ActivityReadService,
  ) {}

  /**
   * POST /api/v1/activity/events — batch, idempotent, partial.
   *
   * 200 even when some events are rejected (§4.2): one permanently-invalid row
   * must never block the 99 behind it in a device queue. 400 is reserved for
   * the envelope, where no per-event result would be meaningful.
   *
   * The user comes from the bearer token; there is no userId in the body.
   */
  @Post('events')
  @HttpCode(HttpStatus.OK)
  async ingest(
    @CurrentUser() user: CurrentUserData,
    @Body() body: IngestEventsDto,
  ): Promise<IngestResult> {
    const events = this.readEnvelope(body);
    return this.activityService.ingest(user.userId, events);
  }

  /**
   * GET /api/v1/activity/today — the whole Today screen in one call (§5).
   *
   * `timezone` is required and the server echoes the `localDay` it derives
   * from it (§5.2). Without it the server would have to answer "what day is
   * it?" from its own UTC clock, and a user in Asia/Kolkata at 02:00 IST would
   * be shown yesterday's card, yesterday's counts and a streak that looks
   * broken.
   *
   * Query parameters are taken one at a time rather than through a DTO: the
   * global ValidationPipe in `main.ts` runs before this controller's and would
   * throw its own shape for any constraint decorator, costing the frozen
   * `code` a client branches on. Validation lives in the service, where every
   * code in §5.5 is raised explicitly.
   */
  @Get('today')
  async today(
    @CurrentUser() user: CurrentUserData,
    @Query('faithId') faithId?: string,
    @Query('timezone') timezone?: string,
    @Query('localDay') localDay?: string,
  ): Promise<TodayResponse> {
    return this.readService.today(user.userId, faithId, timezone, localDay);
  }

  /**
   * GET /api/v1/activity/history — one row per day, dense over [from, to] (§6).
   *
   * No `timezone`: `from` and `to` are already explicit local days (§6.1).
   * Over 92 days is `400 range_too_large`, never a silent truncation (§6.2).
   */
  @Get('history')
  async history(
    @CurrentUser() user: CurrentUserData,
    @Query('faithId') faithId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<HistoryResponse> {
    return this.readService.history(user.userId, faithId, from, to);
  }

  /**
   * PUT /api/v1/activity/goal — set or replace the daily goal (§7).
   *
   * 200 for both a first-time set and a replacement; `PUT` is an upsert of the
   * single goal per (user, faith) and the client does not distinguish them
   * (§7.3). The response re-evaluates today against the new goal, so no
   * follow-up `GET /today` is needed.
   */
  @Put('goal')
  @HttpCode(HttpStatus.OK)
  async setGoal(
    @CurrentUser() user: CurrentUserData,
    @Body() body: SetGoalDto,
  ): Promise<GoalResponse> {
    return this.readService.setGoal(user.userId, body);
  }

  /**
   * §4.6 — the three whole-request failures, each with its own stable code.
   *
   * Hand-checked rather than left to class-validator because the global
   * ValidationPipe in `main.ts` runs before any controller-scoped pipe and
   * would throw Nest's default `{message: string[]}` shape first, with no
   * `code` for the client to branch on.
   */
  private readEnvelope(body: IngestEventsDto): unknown[] {
    const events = body?.events;

    if (!Array.isArray(events)) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'malformed_body',
        'Request body must be an object with an "events" array',
      );
    }
    if (events.length < BATCH_MIN) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'empty_batch',
        'A batch must contain at least one event',
      );
    }
    if (events.length > BATCH_MAX) {
      throw activityError(
        HttpStatus.BAD_REQUEST,
        'batch_too_large',
        `A batch may contain at most ${BATCH_MAX} events; received ${events.length}`,
      );
    }
    return events;
  }
}
