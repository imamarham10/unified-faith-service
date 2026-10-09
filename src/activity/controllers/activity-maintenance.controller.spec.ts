import { ExecutionContext, HttpException, Logger } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ActivityMaintenanceController } from './activity-maintenance.controller';
import {
  MAINTENANCE_SECRET_ENV,
  MAINTENANCE_SECRET_HEADER,
  MaintenanceSecretGuard,
} from '../guards/maintenance-secret.guard';
import { ActivityErrorBody } from '../activity-errors';
import { RollupCronService } from '../services/rollup-cron.service';

/**
 * Specs for the maintenance endpoint and the guard in front of it.
 *
 * The endpoint runs the nightly rollup for every user, so "is it actually
 * protected?" is the question this file exists to answer — and it answers it
 * against the guard itself rather than against a comment claiming the guard is
 * wired. The last assertion in the file checks the wiring: that the controller
 * class really carries `MaintenanceSecretGuard`, because a guard that is
 * written and tested but not attached protects nothing.
 */

const SECRET = 'a-long-random-maintenance-secret-value';

/** Express lower-cases incoming header names; Nest hands them through as-is. */
const contextWith = (headers: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers, method: 'POST', url: '/api/v1/maintenance/activity/rollup' }),
    }),
  }) as unknown as ExecutionContext;

/** Unwrap the contract-shaped body an activityError() carries (§3). */
function rejectionOf(call: () => unknown): ActivityErrorBody {
  try {
    call();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    return (error as HttpException).getResponse() as ActivityErrorBody;
  }
  throw new Error('expected the guard to reject');
}

describe('MaintenanceSecretGuard', () => {
  let guard: MaintenanceSecretGuard;
  const original = process.env[MAINTENANCE_SECRET_ENV];

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    guard = new MaintenanceSecretGuard();
    process.env[MAINTENANCE_SECRET_ENV] = SECRET;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (original === undefined) delete process.env[MAINTENANCE_SECRET_ENV];
    else process.env[MAINTENANCE_SECRET_ENV] = original;
  });

  it('admits a request carrying the configured secret', () => {
    expect(guard.canActivate(contextWith({ [MAINTENANCE_SECRET_HEADER]: SECRET }))).toBe(true);
  });

  it('refuses every request when the secret is unset', () => {
    // The expensive failure mode, and the reason this is the first thing
    // asserted: a deploy that forgets the variable must close the endpoint,
    // not open it. Even a request presenting *something* is refused.
    delete process.env[MAINTENANCE_SECRET_ENV];

    const body = rejectionOf(() =>
      guard.canActivate(contextWith({ [MAINTENANCE_SECRET_HEADER]: SECRET })),
    );

    expect(body.statusCode).toBe(401);
    expect(body.code).toBe('unauthorized');
  });

  it('refuses every request when the secret is set to an empty string', () => {
    process.env[MAINTENANCE_SECRET_ENV] = '';

    expect(() => guard.canActivate(contextWith({ [MAINTENANCE_SECRET_HEADER]: '' }))).toThrow(
      HttpException,
    );
  });

  it('refuses a missing header', () => {
    expect(() => guard.canActivate(contextWith({}))).toThrow(HttpException);
  });

  it('refuses a wrong secret of the same length', () => {
    const wrong = `${'x'.repeat(SECRET.length - 1)}y`;
    expect(wrong).toHaveLength(SECRET.length);

    expect(() =>
      guard.canActivate(contextWith({ [MAINTENANCE_SECRET_HEADER]: wrong })),
    ).toThrow(HttpException);
  });

  it('refuses a secret of the wrong length without throwing from the comparison', () => {
    // `timingSafeEqual` throws a RangeError on unequal lengths; the guard must
    // return a clean 401 rather than let that surface as a 500.
    const body = rejectionOf(() =>
      guard.canActivate(contextWith({ [MAINTENANCE_SECRET_HEADER]: 'short' })),
    );

    expect(body.statusCode).toBe(401);
    expect(body.code).toBe('unauthorized');
  });

  it('refuses a non-string header value', () => {
    expect(() =>
      guard.canActivate(contextWith({ [MAINTENANCE_SECRET_HEADER]: ['a', 'b'] })),
    ).toThrow(HttpException);
  });

  it('says nothing about which check failed', () => {
    // Wrong secret, absent header and unconfigured server are one response. A
    // prober learns only that it was refused.
    const wrongSecret = rejectionOf(() =>
      guard.canActivate(contextWith({ [MAINTENANCE_SECRET_HEADER]: 'nope' })),
    );
    const noHeader = rejectionOf(() => guard.canActivate(contextWith({})));
    delete process.env[MAINTENANCE_SECRET_ENV];
    const unconfigured = rejectionOf(() => guard.canActivate(contextWith({})));

    expect(wrongSecret).toEqual(noHeader);
    expect(noHeader).toEqual(unconfigured);
    expect(JSON.stringify(wrongSecret)).not.toContain(SECRET);
  });
});

describe('ActivityMaintenanceController', () => {
  const summary = { ok: true } as any;
  let cron: { runNightlyRollup: jest.Mock; runFullRebuild: jest.Mock };
  let controller: ActivityMaintenanceController;

  beforeEach(() => {
    cron = {
      runNightlyRollup: jest.fn(async () => summary),
      runFullRebuild: jest.fn(async () => summary),
    };
    controller = new ActivityMaintenanceController(cron as unknown as RollupCronService);
  });

  it('is actually guarded by the maintenance secret', () => {
    // A guard that exists but is not attached protects nothing.
    const guards = Reflect.getMetadata(GUARDS_METADATA, ActivityMaintenanceController) ?? [];

    expect(guards).toContain(MaintenanceSecretGuard);
  });

  it('passes the parsed paging options through', async () => {
    await controller.rollup('25', '50', '7', '8000');

    expect(cron.runNightlyRollup).toHaveBeenCalledWith({
      limit: 25,
      offset: 50,
      lookbackDays: 7,
      budgetMs: 8000,
    });
  });

  it('leaves every option undefined when the query string is absent', async () => {
    await controller.rollup();

    expect(cron.runNightlyRollup).toHaveBeenCalledWith({
      limit: undefined,
      offset: undefined,
      lookbackDays: undefined,
      budgetMs: undefined,
    });
  });

  it('degrades a nonsense query value to the service default rather than failing the run', async () => {
    await controller.rollup('not-a-number', '', 'NaN');

    expect(cron.runNightlyRollup).toHaveBeenCalledWith({
      limit: undefined,
      offset: undefined,
      lookbackDays: undefined,
      budgetMs: undefined,
    });
  });

  it('returns the run summary unchanged', async () => {
    await expect(controller.rollup()).resolves.toBe(summary);
  });

  describe('the full-rebuild route', () => {
    it('rides the same class-level guard rather than a second protected surface', () => {
      // The reason this route lives here and not on a new controller: the
      // guard wiring is already asserted above, class-scoped, so it covers
      // every route the class carries.
      const guards = Reflect.getMetadata(GUARDS_METADATA, ActivityMaintenanceController) ?? [];

      expect(guards).toContain(MaintenanceSecretGuard);
      expect(typeof controller.rebuild).toBe('function');
    });

    it('passes the scope and paging options through', async () => {
      await controller.rebuild('5', '10', '8000', 'user-a', 'islam', '2024-01-01', '2024-06-30');

      expect(cron.runFullRebuild).toHaveBeenCalledWith({
        limit: 5,
        offset: 10,
        budgetMs: 8000,
        userId: 'user-a',
        faithId: 'islam',
        from: '2024-01-01',
        to: '2024-06-30',
      });
    });

    it('leaves every option undefined when the query string is absent', async () => {
      await controller.rebuild();

      expect(cron.runFullRebuild).toHaveBeenCalledWith({
        limit: undefined,
        offset: undefined,
        budgetMs: undefined,
        userId: undefined,
        faithId: undefined,
        from: undefined,
        to: undefined,
      });
    });

    it('treats a blank scope value as absent rather than as an empty filter', async () => {
      await controller.rebuild(undefined, undefined, undefined, '  ', '', '  ');

      expect(cron.runFullRebuild).toHaveBeenCalledWith(
        expect.objectContaining({ userId: undefined, faithId: undefined, from: undefined }),
      );
    });

    it('hands a malformed day straight through for the service to reject', async () => {
      // Not parsed or repaired here: silently dropping `from` would widen a
      // deliberately narrow rebuild into a sweep of the account's history, so
      // the service answers it with a 400.
      await controller.rebuild(undefined, undefined, undefined, 'user-a', undefined, 'last-july');

      expect(cron.runFullRebuild).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'last-july' }),
      );
    });

    it('returns the run summary unchanged', async () => {
      await expect(controller.rebuild()).resolves.toBe(summary);
    });
  });
});
