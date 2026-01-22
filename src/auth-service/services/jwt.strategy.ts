import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { JwtPayload } from '../dto/jwt-payload.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private authService: AuthService) {
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    this.logger.log('JWT Strategy initialized');
  }

  async validate(payload: JwtPayload) {
    this.logger.debug(`JWT Strategy - Validating payload for user: ${payload.email} (${payload.sub})`);
    
    // Log expiration info if available (passport-jwt already validates expiration)
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - now;
      this.logger.debug(`Token expires at: ${new Date(payload.exp * 1000).toISOString()}, Time until expiry: ${timeUntilExpiry}s`);
    }

    // Note: passport-jwt already validates expiration when ignoreExpiration: false
    // If we reach here, the token is valid and not expired

    const user = await this.authService.validateJwtPayload(payload);
    if (!user) {
      this.logger.warn(`JWT Strategy - User validation failed for ${payload.email}`);
      throw new UnauthorizedException('User validation failed');
    }
    
    this.logger.debug(`JWT Strategy - User validated successfully: ${payload.email}`);
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
    };
  }
}
