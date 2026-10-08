import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ActivityService } from '../services/activity.service';
import {
  BATCH_MAX,
  BATCH_MIN,
  IngestEventsDto,
  IngestResult,
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
  constructor(private readonly activityService: ActivityService) {}

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
