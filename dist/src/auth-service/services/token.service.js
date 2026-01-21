"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const uuid_1 = require("uuid");
const prisma_service_1 = require("../repositories/prisma.service");
let TokenService = class TokenService {
    constructor(jwtService, prisma, configService) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.configService = configService;
        this.accessTokenExpiresIn = this.configService.get('JWT_ACCESS_TOKEN_EXPIRES_IN', 3600);
        this.refreshTokenExpiresIn = this.configService.get('JWT_REFRESH_TOKEN_EXPIRES_IN', 604800);
    }
    async generateAccessToken(payload) {
        return this.jwtService.sign({
            ...payload,
            type: 'access',
        }, {
            expiresIn: this.accessTokenExpiresIn,
        });
    }
    async generateRefreshToken(userId, deviceInfo) {
        const tokenId = (0, uuid_1.v4)();
        const expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn * 1000);
        const tokenString = `${tokenId}:${userId}:${Date.now()}`;
        const tokenHash = await bcrypt.hash(tokenString, 10);
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
        return this.jwtService.sign({
            sub: userId,
            type: 'refresh',
            tokenId,
        }, {
            expiresIn: this.refreshTokenExpiresIn,
        });
    }
    async validateRefreshToken(token) {
        try {
            const payload = this.jwtService.verify(token);
            if (payload.type !== 'refresh') {
                throw new common_1.UnauthorizedException('Invalid token type');
            }
            const refreshToken = await this.prisma.refreshToken.findUnique({
                where: {
                    tokenId: payload.tokenId,
                },
            });
            if (!refreshToken) {
                throw new common_1.UnauthorizedException('Refresh token not found');
            }
            if (refreshToken.isRevoked) {
                throw new common_1.UnauthorizedException('Refresh token has been revoked');
            }
            if (refreshToken.expiresAt < new Date()) {
                throw new common_1.UnauthorizedException('Refresh token has expired');
            }
            if (refreshToken.userId !== payload.sub) {
                throw new common_1.UnauthorizedException('Token user mismatch');
            }
            return {
                userId: refreshToken.userId,
                tokenId: refreshToken.tokenId,
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async revokeRefreshToken(tokenId, reason) {
        await this.prisma.refreshToken.update({
            where: { tokenId },
            data: {
                isRevoked: true,
            },
        });
    }
    async revokeAllUserTokens(userId) {
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
    async rotateRefreshToken(oldTokenId, userId, deviceInfo) {
        await this.revokeRefreshToken(oldTokenId, 'refresh');
        return this.generateRefreshToken(userId, deviceInfo);
    }
    async updateLastUsed(tokenId) {
        await this.prisma.refreshToken.update({
            where: { tokenId },
            data: {
                lastUsedAt: new Date(),
            },
        });
    }
    async cleanupExpiredTokens() {
        await this.prisma.refreshToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService,
        config_1.ConfigService])
], TokenService);
//# sourceMappingURL=token.service.js.map