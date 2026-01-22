import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../repositories/prisma.service';
import { JwtPayload } from '../dto/jwt-payload.dto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessTokenExpiresIn: number;
  private readonly refreshTokenExpiresIn: number;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.accessTokenExpiresIn = this.configService.get<number>('JWT_ACCESS_TOKEN_EXPIRES_IN', 3600); // 1 hour
    this.refreshTokenExpiresIn = this.configService.get<number>('JWT_REFRESH_TOKEN_EXPIRES_IN', 604800); // 7 days
  }

  /**
   * Generate access token (JWT)
   */
  async generateAccessToken(payload: JwtPayload): Promise<string> {
    this.logger.log(`Generating access token for user: ${payload.email} (${payload.sub})`);
    
    const token = this.jwtService.sign(
      {
        ...payload,
        type: 'access',
      },
      {
        expiresIn: this.accessTokenExpiresIn,
      },
    );
    
    // Verify the token can be decoded with the same secret (sanity check)
    try {
      const decoded = this.jwtService.verify(token);
      this.logger.debug(
        `Access token generated and verified successfully for ${payload.email}. ` +
        `Token expires at: ${decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'N/A'}`
      );
    } catch (verifyError) {
      this.logger.error(
        `CRITICAL: Generated token cannot be verified with same secret! ` +
        `This indicates a JWT_SECRET mismatch. Error: ${verifyError.message}`
      );
    }
    
    return token;
  }

  /**
   * Generate refresh token (JWT + store in DB)
   */
  async generateRefreshToken(userId: string, deviceInfo?: any): Promise<string> {
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn * 1000);

    // Create a token string to hash (tokenId + userId + timestamp)
    const tokenString = `${tokenId}:${userId}:${Date.now()}`;
    const tokenHash = await bcrypt.hash(tokenString, 10);

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        tokenId,
        userId,
        tokenHash,
        expiresAt,
        isRevoked: false,
        deviceInfo: deviceInfo || null,
      },
    });

    // Generate JWT with tokenId for validation
    return this.jwtService.sign(
      {
        sub: userId,
        type: 'refresh',
        tokenId,
      },
      {
        expiresIn: this.refreshTokenExpiresIn,
      },
    );
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(token: string): Promise<{ userId: string; tokenId: string }> {
    try {
      // Verify JWT signature
      const payload = this.jwtService.verify(token) as { sub: string; type: string; tokenId: string };

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if token exists in database and is not revoked
      const refreshToken = await this.prisma.refreshToken.findUnique({
        where: {
          tokenId: payload.tokenId,
        },
      });

      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token not found');
      }

      if (refreshToken.isRevoked) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      if (refreshToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      if (refreshToken.userId !== payload.sub) {
        throw new UnauthorizedException('Token user mismatch');
      }

      return {
        userId: refreshToken.userId,
        tokenId: refreshToken.tokenId,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(tokenId: string, reason?: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { tokenId },
      data: {
        isRevoked: true,
      },
    });
  }

  /**
   * Revoke all refresh tokens for a user (logout all devices)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });
  }

  /**
   * Rotate refresh token (generate new, revoke old)
   */
  async rotateRefreshToken(oldTokenId: string, userId: string, deviceInfo?: any): Promise<string> {
    // Revoke old token
    await this.revokeRefreshToken(oldTokenId, 'refresh');

    // Generate new token
    return this.generateRefreshToken(userId, deviceInfo);
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { tokenId },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Cleanup expired tokens (should be run as a scheduled job)
   */
  async cleanupExpiredTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
