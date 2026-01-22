import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../repositories/prisma.service';
import { JwtPayload } from '../dto/jwt-payload.dto';
export declare class TokenService {
    private jwtService;
    private prisma;
    private configService;
    private readonly logger;
    private readonly accessTokenExpiresIn;
    private readonly refreshTokenExpiresIn;
    constructor(jwtService: JwtService, prisma: PrismaService, configService: ConfigService);
    generateAccessToken(payload: JwtPayload): Promise<string>;
    generateRefreshToken(userId: string, deviceInfo?: any): Promise<string>;
    validateRefreshToken(token: string): Promise<{
        userId: string;
        tokenId: string;
    }>;
    revokeRefreshToken(tokenId: string, reason?: string): Promise<void>;
    revokeAllUserTokens(userId: string): Promise<void>;
    rotateRefreshToken(oldTokenId: string, userId: string, deviceInfo?: any): Promise<string>;
    updateLastUsed(tokenId: string): Promise<void>;
    cleanupExpiredTokens(): Promise<void>;
}
