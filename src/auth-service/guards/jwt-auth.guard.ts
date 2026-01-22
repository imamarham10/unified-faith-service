import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    
    this.logger.debug(`JWT Guard - Checking authentication for ${request.method} ${request.url}`);
    this.logger.debug(`Authorization header: ${authHeader ? 'Present' : 'Missing'}`);

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    
    if (err) {
      this.logger.error(`JWT Guard Error: ${err.message}`, err.stack);
      throw new UnauthorizedException(`Authentication failed: ${err.message}`);
    }

    if (info) {
      this.logger.warn(`JWT Guard Info: ${JSON.stringify(info)}`);
      
      if (info.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired. Please login again.');
      }
      
      if (info.name === 'JsonWebTokenError') {
        // Most common: invalid signature (JWT_SECRET mismatch)
        if (info.message === 'invalid signature') {
          this.logger.error(
            'JWT Secret Mismatch! Token was signed with a different secret. ' +
            'Please login again to get a new token signed with the current secret.'
          );
          throw new UnauthorizedException(
            'Invalid token signature. This usually means the JWT_SECRET changed. Please login again.'
          );
        }
        throw new UnauthorizedException(`Invalid token: ${info.message}`);
      }
      
      if (info.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not active yet');
      }
    }

    if (!user) {
      this.logger.warn(`JWT Guard - No user found for ${request.method} ${request.url}`);
      throw new UnauthorizedException('Invalid or missing token');
    }

    this.logger.debug(`JWT Guard - User authenticated: ${user.email} (${user.userId})`);
    return user;
  }
}
