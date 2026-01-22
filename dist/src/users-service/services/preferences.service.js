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
var PreferencesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../repositories/prisma.service");
let PreferencesService = PreferencesService_1 = class PreferencesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PreferencesService_1.name);
    }
    async getPreferences(userId) {
        let preferences = await this.prisma.userPreference.findUnique({
            where: { userId },
        });
        if (!preferences) {
            preferences = await this.createDefaultPreferences(userId);
        }
        return {
            id: preferences.id,
            userId: preferences.userId,
            faith: preferences.faith || undefined,
            language: preferences.language || undefined,
            countryCode: preferences.countryCode || undefined,
            timezone: preferences.timezone || undefined,
            notificationPreferences: preferences.notificationPreferences || undefined,
            contentPreferences: preferences.contentPreferences || undefined,
            createdAt: preferences.createdAt,
            updatedAt: preferences.updatedAt,
        };
    }
    async updatePreferences(userId, updatePreferencesDto) {
        const existingPreferences = await this.prisma.userPreference.findUnique({
            where: { userId },
        });
        let preferences;
        if (!existingPreferences) {
            preferences = await this.prisma.userPreference.create({
                data: {
                    userId,
                    faith: updatePreferencesDto.faith || null,
                    language: updatePreferencesDto.language || 'en',
                    countryCode: updatePreferencesDto.countryCode || null,
                    timezone: updatePreferencesDto.timezone || null,
                    notificationPreferences: updatePreferencesDto.notificationPreferences
                        ? JSON.parse(JSON.stringify(updatePreferencesDto.notificationPreferences))
                        : {},
                    contentPreferences: updatePreferencesDto.contentPreferences
                        ? JSON.parse(JSON.stringify(updatePreferencesDto.contentPreferences))
                        : {},
                },
            });
        }
        else {
            const updateData = {};
            if (updatePreferencesDto.faith !== undefined) {
                updateData.faith = updatePreferencesDto.faith || null;
            }
            if (updatePreferencesDto.language !== undefined) {
                updateData.language = updatePreferencesDto.language || null;
            }
            if (updatePreferencesDto.countryCode !== undefined) {
                updateData.countryCode = updatePreferencesDto.countryCode || null;
            }
            if (updatePreferencesDto.timezone !== undefined) {
                updateData.timezone = updatePreferencesDto.timezone || null;
            }
            if (updatePreferencesDto.notificationPreferences !== undefined) {
                updateData.notificationPreferences = {
                    ...(existingPreferences.notificationPreferences || {}),
                    ...JSON.parse(JSON.stringify(updatePreferencesDto.notificationPreferences)),
                };
            }
            if (updatePreferencesDto.contentPreferences !== undefined) {
                updateData.contentPreferences = {
                    ...(existingPreferences.contentPreferences || {}),
                    ...JSON.parse(JSON.stringify(updatePreferencesDto.contentPreferences)),
                };
            }
            preferences = await this.prisma.userPreference.update({
                where: { userId },
                data: updateData,
            });
        }
        const finalPreferences = updatePreferencesDto.notificationPreferences
            ? { ...(preferences.notificationPreferences || {}), ...updatePreferencesDto.notificationPreferences }
            : (preferences.notificationPreferences || {});
        if (finalPreferences.push === true) {
            const deviceTokens = await this.prisma.deviceToken.findMany({
                where: {
                    userId,
                    isActive: true,
                },
            });
            if (deviceTokens.length === 0) {
                this.logger.warn(`User ${userId} enabled push notifications but has no registered device tokens. ` +
                    `Please register a device token via POST /users/device-tokens`);
            }
        }
        return {
            id: preferences.id,
            userId: preferences.userId,
            faith: preferences.faith || undefined,
            language: preferences.language || undefined,
            countryCode: preferences.countryCode || undefined,
            timezone: preferences.timezone || undefined,
            notificationPreferences: preferences.notificationPreferences || undefined,
            contentPreferences: preferences.contentPreferences || undefined,
            createdAt: preferences.createdAt,
            updatedAt: preferences.updatedAt,
        };
    }
    async getPreferencesByUserId(userId) {
        return this.getPreferences(userId);
    }
    async createDefaultPreferences(userId) {
        return this.prisma.userPreference.create({
            data: {
                userId,
                language: 'en',
                notificationPreferences: {
                    push: true,
                    email: true,
                    sms: false,
                    dailyPacket: true,
                    aiGuru: true,
                },
                contentPreferences: {
                    showAds: true,
                    audioQuality: 'standard',
                    downloadQuality: 'standard',
                },
            },
        });
    }
};
exports.PreferencesService = PreferencesService;
exports.PreferencesService = PreferencesService = PreferencesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PreferencesService);
//# sourceMappingURL=preferences.service.js.map