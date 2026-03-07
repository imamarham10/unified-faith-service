import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    // If no auth header, skip authentication — request proceeds without user
    if (!authHeader) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // Don't throw on errors — just return null so the route can proceed unauthenticated
    if (err || !user) {
      return null;
    }
    return user;
  }
}
