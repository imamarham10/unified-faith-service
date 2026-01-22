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
exports.DeviceTokenService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../repositories/prisma.service");
let DeviceTokenService = class DeviceTokenService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async registerDeviceToken(userId, registerDto) {
        const platform = registerDto.platform || 'web';
        const deviceToken = await this.prisma.deviceToken.upsert({
            where: {
                userId_token: {
                    userId,
                    token: registerDto.token,
                },
            },
            update: {
                platform,
                deviceId: registerDto.deviceId,
                deviceName: registerDto.deviceName,
                isActive: true,
                lastUsedAt: new Date(),
            },
            create: {
                userId,
                token: registerDto.token,
                platform,
                deviceId: registerDto.deviceId,
                deviceName: registerDto.deviceName,
                isActive: true,
                lastUsedAt: new Date(),
            },
        });
        return {
            id: deviceToken.id,
            userId: deviceToken.userId,
            token: deviceToken.token,
            platform: deviceToken.platform,
            deviceId: deviceToken.deviceId || undefined,
            deviceName: deviceToken.deviceName || undefined,
            isActive: deviceToken.isActive,
            lastUsedAt: deviceToken.lastUsedAt || undefined,
            createdAt: deviceToken.createdAt,
            updatedAt: deviceToken.updatedAt,
        };
    }
    async getUserDeviceTokens(userId) {
        const tokens = await this.prisma.deviceToken.findMany({
            where: {
                userId,
                isActive: true,
            },
            orderBy: {
                lastUsedAt: 'desc',
            },
        });
        return tokens.map((token) => ({
            id: token.id,
            userId: token.userId,
            token: token.token,
            platform: token.platform,
            deviceId: token.deviceId || undefined,
            deviceName: token.deviceName || undefined,
            isActive: token.isActive,
            lastUsedAt: token.lastUsedAt || undefined,
            createdAt: token.createdAt,
            updatedAt: token.updatedAt,
        }));
    }
    async removeDeviceToken(userId, tokenId) {
        const deviceToken = await this.prisma.deviceToken.findFirst({
            where: {
                id: tokenId,
                userId,
            },
        });
        if (!deviceToken) {
            throw new common_1.NotFoundException(`Device token with ID ${tokenId} not found`);
        }
        await this.prisma.deviceToken.update({
            where: { id: tokenId },
            data: { isActive: false },
        });
    }
    async removeAllDeviceTokens(userId) {
        await this.prisma.deviceToken.updateMany({
            where: {
                userId,
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });
    }
    async getActiveFcmTokens(userId) {
        const tokens = await this.prisma.deviceToken.findMany({
            where: {
                userId,
                isActive: true,
                platform: {
                    in: ['android', 'ios', 'web'],
                },
            },
            select: {
                token: true,
            },
        });
        return tokens.map((t) => t.token);
    }
};
exports.DeviceTokenService = DeviceTokenService;
exports.DeviceTokenService = DeviceTokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DeviceTokenService);
//# sourceMappingURL=device-token.service.js.map