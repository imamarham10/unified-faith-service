import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  ValidationError,
} from '@nestjs/common';

/**
 * The contract's error shape (§3) and the machinery that delivers it.
 *
 *   { statusCode, message, code, errors? }
 *
 * `code` is the only field a client may branch on. The repo registers no
 * exception filter and no `exceptionFactory`, so Nest's defaults emit
 * `{statusCode, message: string[], error}` — which carries no machine-readable
 * code at all. Both pieces below are scoped to the activity controller
 * deliberately: making them global would rewrite the error shape of all 41
 * existing endpoints documented in `APIs.md`, which is not this task's to do.
 */

export interface ActivityErrorBody {
  statusCode: number;
  message: string;
  code: string;
  errors?: Record<string, string[]>;
}

/** Build a contract-shaped HttpException. Use for every error we raise. */
export function activityError(
  statusCode: number,
  code: string,
  message: string,
  errors?: Record<string, string[]>,
): HttpException {
  const body: ActivityErrorBody = { statusCode, message, code };
  if (errors) body.errors = errors;
  return new HttpException(body, statusCode);
}

/**
 * A `ValidationPipe` exceptionFactory producing the contract shape, reading a
 * per-constraint `code` from class-validator's `context` option:
 *
 *   @ArrayMaxSize(100, { context: { code: 'batch_too_large' } })
 *
 * Caveat, and it is a real one: `main.ts` registers a **global**
 * ValidationPipe, and Nest runs global pipes before controller-, route- and
 * param-scoped ones on the same parameter. A controller-scoped pipe carrying
 * this factory can therefore never see an error the global pipe already threw.
 * `ActivityExceptionFilter` below is what actually guarantees the shape today;
 * this factory becomes the delivering mechanism only if it is moved to
 * `main.ts`. It is kept here, wired and tested, so that move is one line.
 */
export function activityValidationExceptionFactory(
  validationErrors: ValidationError[] = [],
): HttpException {
  const errors: Record<string, string[]> = {};
  let code = 'validation_failed';

  const walk = (list: ValidationError[], prefix = '') => {
    for (const error of list) {
      const path = prefix ? `${prefix}.${error.property}` : error.property;
      const constraints = error.constraints ?? {};
      const messages = Object.values(constraints);
      if (messages.length) {
        errors[path] = [...(errors[path] ?? []), ...messages];
      }
      // The first constraint that names a code wins, so the client sees the
      // most specific failure rather than a generic one.
      for (const constraintName of Object.keys(constraints)) {
        const named = error.contexts?.[constraintName]?.code;
        if (named && code === 'validation_failed') code = named;
      }
      if (error.children?.length) walk(error.children, path);
    }
  };
  walk(validationErrors);

  const first = Object.values(errors)[0]?.[0];
  return activityError(
    HttpStatus.BAD_REQUEST,
    code,
    first ?? 'Request validation failed',
    Object.keys(errors).length ? errors : undefined,
  );
}

/**
 * Normalises everything leaving the activity controller into §3's shape.
 *
 * Bound at the controller, it catches exceptions thrown by that route's
 * guards, pipes, controller and service alike. That matters for two cases we
 * do not otherwise control:
 *
 *  - the shared `JwtAuthGuard` throws `UnauthorizedException` with prose and
 *    no `code`; §3 requires `code: "unauthorized"`;
 *  - the global `ValidationPipe`'s default `{message: string[]}` output.
 *
 * Not covered: a body that is not JSON at all. Express's body parser rejects
 * it in middleware, before routing, so no controller-scoped filter can see it
 * — that 400 arrives without a `code`. Only a global filter could fix it.
 */
const CODE_BY_STATUS: Record<number, string> = {
  400: 'malformed_body',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  413: 'malformed_body',
};

@Catch()
export class ActivityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ActivityExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    const body = this.toBody(exception);
    response.status(body.statusCode).json(body);
  }

  /** Exposed for unit tests, which have no HTTP response to assert against. */
  toBody(exception: unknown): ActivityErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // Already contract-shaped (everything activityError() built): pass through.
      if (
        payload &&
        typeof payload === 'object' &&
        typeof (payload as ActivityErrorBody).code === 'string'
      ) {
        return { ...(payload as ActivityErrorBody), statusCode: status };
      }

      // Nest's default shape, or a bare string message.
      const raw =
        payload && typeof payload === 'object'
          ? (payload as { message?: unknown }).message
          : payload;
      const message = Array.isArray(raw)
        ? raw.join('; ')
        : typeof raw === 'string'
          ? raw
          : exception.message;

      const out: ActivityErrorBody = {
        statusCode: status,
        message,
        code: CODE_BY_STATUS[status] ?? (status >= 500 ? 'internal_error' : 'bad_request'),
      };
      if (Array.isArray(raw) && raw.length) out.errors = { body: raw.map(String) };
      return out;
    }

    // Anything unhandled is a server fault. §4.6: retryable, and retrying is
    // free because ingest is idempotent.
    this.logger.error(
      `Unhandled activity error: ${(exception as Error)?.message}`,
      (exception as Error)?.stack,
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      code: 'internal_error',
    };
  }
}
