import {
  ArgumentsHost,
  ArgumentMetadata,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ActivityController } from './activity.controller';
import { ActivityService } from '../services/activity.service';
import {
  ActivityErrorBody,
  ActivityExceptionFilter,
  activityValidationExceptionFactory,
} from '../activity-errors';
import { BATCH_MAX, IngestEventsDto } from '../dto/activity.dto';

/**
 * Envelope semantics (§4.6) and the error shape (§3).
 *
 * The controller is exercised directly rather than over HTTP: supertest is not
 * a dependency of this repo, and the envelope rules under test are pure
 * controller logic. ActivityService is mocked, so no PrismaService — and
 * therefore no database connection — is ever constructed.
 */

const USER = {
  userId: 'user-under-test',
  email: 'nobody@example.com',
  roles: [],
  permissions: [],
};

/** Unwrap the contract-shaped body an activityError() carries. */
function bodyOf(error: unknown): ActivityErrorBody {
  expect(error).toBeInstanceOf(HttpException);
  return (error as HttpException).getResponse() as ActivityErrorBody;
}

async function expectRejection(promise: Promise<unknown>): Promise<ActivityErrorBody> {
  try {
    await promise;
  } catch (error) {
    return bodyOf(error);
  }
  throw new Error('expected the controller to throw');
}

describe('ActivityController', () => {
  let controller: ActivityController;
  let service: { ingest: jest.Mock };

  beforeEach(async () => {
    service = { ingest: jest.fn(async () => ({ accepted: 0, duplicates: 0, rejected: [] })) };
    const moduleRef = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [{ provide: ActivityService, useValue: service }],
    }).compile();
    controller = moduleRef.get(ActivityController);
  });

  describe('POST /events — the envelope (§4.6)', () => {
    it('passes a well-formed batch to the service under the token holder', async () => {
      const events = [{ clientEventId: 'anything' }];
      await controller.ingest(USER, { events });
      expect(service.ingest).toHaveBeenCalledWith(USER.userId, events);
    });

    it('returns the bare {accepted, duplicates, rejected} body, not the repo wrapper', async () => {
      service.ingest.mockResolvedValueOnce({ accepted: 2, duplicates: 1, rejected: [] });
      const result = await controller.ingest(USER, { events: [{}] });

      expect(result).toEqual({ accepted: 2, duplicates: 1, rejected: [] });
      expect(result).not.toHaveProperty('data');
      expect(result).not.toHaveProperty('statusCode');
    });

    it('rejects an empty batch with 400 empty_batch', async () => {
      const body = await expectRejection(controller.ingest(USER, { events: [] }));
      expect(body).toMatchObject({ statusCode: 400, code: 'empty_batch' });
      expect(service.ingest).not.toHaveBeenCalled();
    });

    it('rejects more than 100 events with 400 batch_too_large', async () => {
      const events = Array.from({ length: BATCH_MAX + 1 }, () => ({}));
      const body = await expectRejection(controller.ingest(USER, { events }));

      expect(body).toMatchObject({ statusCode: 400, code: 'batch_too_large' });
      expect(body.message).toContain('101');
      expect(service.ingest).not.toHaveBeenCalled();
    });

    it('accepts exactly 100 events', async () => {
      const events = Array.from({ length: BATCH_MAX }, () => ({}));
      await controller.ingest(USER, { events });
      expect(service.ingest).toHaveBeenCalled();
    });

    it('rejects a missing or non-array events field with 400 malformed_body', async () => {
      for (const events of [undefined, null, 'nope', 42, { 0: 'x' }]) {
        const body = await expectRejection(
          controller.ingest(USER, { events } as { events?: unknown }),
        );
        expect(body).toMatchObject({ statusCode: 400, code: 'malformed_body' });
      }
      expect(service.ingest).not.toHaveBeenCalled();
    });

    it('never lets the body choose the user', async () => {
      await controller.ingest(USER, {
        events: [{}],
        userId: 'someone-else',
      } as Record<string, unknown>);
      expect(service.ingest).toHaveBeenCalledWith(USER.userId, [{}]);
    });

    it('carries a machine-readable code on every envelope failure (§3)', async () => {
      const bodies = [
        await expectRejection(controller.ingest(USER, { events: [] })),
        await expectRejection(controller.ingest(USER, { events: undefined })),
        await expectRejection(
          controller.ingest(USER, { events: Array.from({ length: 101 }, () => ({})) }),
        ),
      ];
      for (const body of bodies) {
        expect(typeof body.code).toBe('string');
        expect(body.code).toMatch(/^[a-z_]+$/);
        expect(typeof body.message).toBe('string');
      }
    });
  });
});

/**
 * The riskiest assumption in the module, and the one the direct-call specs
 * above cannot see: in production the body passes through TWO ValidationPipes
 * before the controller — the global one in `main.ts`, then the
 * controller-scoped one — and the global pipe runs `whitelist: true`, which
 * strips every property lacking a validation decorator.
 *
 * If `@Allow()` did not keep `events` alive, `body.events` would be undefined
 * on every single request, the endpoint would return `malformed_body`
 * universally, and every other spec in this file would still pass.
 */
describe('the pipes main.ts actually registers', () => {
  /** Byte-for-byte the options in src/main.ts. */
  const globalPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
    transformOptions: { enableImplicitConversion: true },
  });

  /** The pipe instance genuinely bound to the controller by @UsePipes. */
  const boundPipes: ValidationPipe[] =
    Reflect.getMetadata('__pipes__', ActivityController) ?? [];

  const meta: ArgumentMetadata = { type: 'body', metatype: IngestEventsDto, data: '' };

  it('binds exactly one controller-scoped ValidationPipe', () => {
    expect(boundPipes).toHaveLength(1);
    expect(boundPipes[0]).toBeInstanceOf(ValidationPipe);
  });

  it('keeps the events array alive through both passes, contents intact', async () => {
    const event = {
      clientEventId: '6f1b2c4e-9d3a-4f87-9f1a-2c7f0b5d8e10',
      faithId: 'islam',
      activityType: 'quran_verse',
      quantity: 1,
      occurredAt: '2026-10-08T14:03:22Z',
      localDay: '2026-10-08',
      timezone: 'Asia/Kolkata',
      sourceRef: 'quran:2:148',
    };

    const once = await globalPipe.transform({ events: [event] }, meta);
    const twice = await boundPipes[0].transform(once, meta);

    expect(Array.isArray(twice.events)).toBe(true);
    expect(twice.events).toHaveLength(1);
    expect(twice.events[0]).toEqual(event);
  });

  it('strips an unknown envelope field without erroring (§1.7)', async () => {
    const body = await globalPipe.transform(
      { events: [], deviceModel: 'Pixel 9' },
      meta,
    );
    expect(body).not.toHaveProperty('deviceModel');
    expect(body).toHaveProperty('events');
  });

  it('leaves per-event fields untouched — the pipes never recurse into the array', async () => {
    // §4.2 depends on this: a nested @ValidateNested DTO would make the global
    // pipe 400 the whole batch on one bad event, which is the poison pill the
    // contract forbids. Unknown per-event keys are instead dropped by the
    // service, which builds each row from known columns only.
    const once = await globalPipe.transform(
      { events: [{ anything: 'at all', nested: { deep: true } }] },
      meta,
    );
    const twice = await boundPipes[0].transform(once, meta);
    expect(twice.events[0]).toEqual({ anything: 'at all', nested: { deep: true } });
  });

  it('never throws on a body the per-event layer must judge', async () => {
    // One permanently-invalid event must reach the service, not 400 at the pipe.
    const body = { events: [{ clientEventId: 'not-a-uuid' }, {}, null] };
    await expect(globalPipe.transform(body, meta)).resolves.toBeDefined();
  });

  it('answers 200, not Nest\'s POST default of 201 (§4.2)', () => {
    // §4.2 and §4.8 both hang on the batch settling with a 200.
    expect(
      Reflect.getMetadata('__httpCode__', ActivityController.prototype.ingest),
    ).toBe(200);
  });
});

describe('ActivityExceptionFilter (§3)', () => {
  const filter = new ActivityExceptionFilter();

  it('passes a contract-shaped error through unchanged', () => {
    const thrown = new HttpException(
      { statusCode: 400, message: 'too many', code: 'batch_too_large' },
      400,
    );
    expect(filter.toBody(thrown)).toEqual({
      statusCode: 400,
      message: 'too many',
      code: 'batch_too_large',
    });
  });

  it('gives the shared JwtAuthGuard 401 the code the contract requires', () => {
    // The guard throws prose with no code; §3 says 401 must carry
    // `code: "unauthorized"`.
    const body = filter.toBody(new UnauthorizedException('Invalid or missing token'));
    expect(body).toEqual({
      statusCode: 401,
      message: 'Invalid or missing token',
      code: 'unauthorized',
    });
  });

  it('reshapes Nest default ValidationPipe output into the contract shape', () => {
    const nestDefault = new HttpException(
      { statusCode: 400, message: ['target must not be greater than 1000'], error: 'Bad Request' },
      400,
    );
    const body = filter.toBody(nestDefault);

    expect(body.statusCode).toBe(400);
    expect(typeof body.message).toBe('string');
    expect(body.code).toBe('malformed_body');
    expect(body.errors).toEqual({ body: ['target must not be greater than 1000'] });
  });

  it('turns an unhandled fault into 500 internal_error rather than leaking it', () => {
    // The filter logs the fault; silence it so a passing run stays readable.
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    expect(filter.toBody(new Error('pg: connection terminated'))).toEqual({
      statusCode: 500,
      message: 'Internal server error',
      code: 'internal_error',
    });
    log.mockRestore();
  });

  it('writes the body to the HTTP response with a matching status', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    filter.catch(new UnauthorizedException('nope'), host);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: 'unauthorized' }),
    );
  });
});

describe('activityValidationExceptionFactory', () => {
  it('lifts a per-constraint code out of class-validator context', () => {
    const exception = activityValidationExceptionFactory([
      {
        property: 'events',
        constraints: { arrayMaxSize: 'events must contain not more than 100 elements' },
        contexts: { arrayMaxSize: { code: 'batch_too_large' } },
      } as never,
    ]);

    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.getResponse()).toMatchObject({
      statusCode: 400,
      code: 'batch_too_large',
      errors: { events: ['events must contain not more than 100 elements'] },
    });
  });

  it('falls back to validation_failed when no constraint names a code', () => {
    const exception = activityValidationExceptionFactory([
      { property: 'target', constraints: { max: 'target must not be greater than 1000' } } as never,
    ]);
    expect(exception.getResponse()).toMatchObject({ code: 'validation_failed' });
  });

  it('flattens nested property paths', () => {
    const exception = activityValidationExceptionFactory([
      {
        property: 'goal',
        children: [
          { property: 'target', constraints: { min: 'target must not be less than 1' } },
        ],
      } as never,
    ]);
    expect(exception.getResponse()).toMatchObject({
      errors: { 'goal.target': ['target must not be less than 1'] },
    });
  });
});
