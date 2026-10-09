import { CanActivate, ExecutionContext, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { activityError } from '../activity-errors';

/** The header the shared secret is presented in. */
export const MAINTENANCE_SECRET_HEADER = 'x-maintenance-secret';
/** The environment variable it is compared against. */
export const MAINTENANCE_SECRET_ENV = 'MAINTENANCE_SECRET';

/**
 * Shared-secret guard for the maintenance endpoints.
 *
 * The rollup job is called by a GitHub Actions cron, which holds no user and
 * therefore no bearer token — `JwtAuthGuard` cannot protect it. A shared
 * secret in a header is the right weight for a server-to-server call that
 * takes no user input and returns only counts.
 *
 * Three properties, each deliberate:
 *
 *  - **Fail closed.** An unset or empty `MAINTENANCE_SECRET` denies every
 *    request. The easy and expensive bug here is the inverse: a missing
 *    variable that makes the endpoint public on the first deploy that forgets
 *    it, with nothing failing to say so. It is logged at `error` so the cause
 *    is visible in the function logs.
 *  - **Constant-time comparison.** `===` on a secret leaks its prefix through
 *    response timing. `timingSafeEqual` throws on a length mismatch, so the
 *    unequal-length branch burns an equivalent comparison before returning
 *    false rather than returning early.
 *  - **No detail in the response.** Wrong secret, missing header and
 *    unconfigured server are one indistinguishable 401. A probe learns
 *    nothing about which it hit.
 *
 * Configuration: set `MAINTENANCE_SECRET` in the Vercel project environment
 * and the identical value as the `MAINTENANCE_SECRET` GitHub Actions repo
 * secret. Rotate by setting both, in that order.
 */
@Injectable()
export class MaintenanceSecretGuard implements CanActivate {
  private readonly logger = new Logger(MaintenanceSecretGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const expected = process.env[MAINTENANCE_SECRET_ENV];

    if (typeof expected !== 'string' || expected.length === 0) {
      this.logger.error(
        `${MAINTENANCE_SECRET_ENV} is not configured; refusing every maintenance request. ` +
          'Set it in the Vercel project environment to enable the nightly rollup.',
      );
      throw this.deny();
    }

    const request = context.switchToHttp().getRequest();
    const presented = request?.headers?.[MAINTENANCE_SECRET_HEADER];

    if (typeof presented !== 'string' || !equalsInConstantTime(presented, expected)) {
      this.logger.warn(
        `Rejected maintenance request to ${request?.method} ${request?.url}: bad or missing secret`,
      );
      throw this.deny();
    }

    return true;
  }

  /** §3's error shape, so the maintenance routes answer like the rest of the module. */
  private deny() {
    return activityError(HttpStatus.UNAUTHORIZED, 'unauthorized', 'Unauthorized');
  }
}

function equalsInConstantTime(presented: string, expected: string): boolean {
  const left = Buffer.from(presented, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  if (left.length !== right.length) {
    // timingSafeEqual throws on unequal lengths. Compare something of equal
    // length instead of returning early, so a wrong-length secret costs the
    // same wall clock as a wrong-value one.
    timingSafeEqual(right, right);
    return false;
  }
  return timingSafeEqual(left, right);
}
