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
exports.DuasService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../common/utils/prisma.service");
let DuasService = class DuasService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDuas(filters) {
        const where = {};
        if (filters?.categoryId) {
            where.categoryId = filters.categoryId;
        }
        return this.prisma.dua.findMany({
            where,
            include: {
                category: true,
            },
        });
    }
    async getDua(id) {
        return this.prisma.dua.findUnique({
            where: { id },
            include: {
                category: true,
            },
        });
    }
    async getCategories() {
        return this.prisma.duaCategory.findMany({
            orderBy: {
                name: 'asc',
            },
        });
    }
    async searchDuas(query) {
        return this.prisma.dua.findMany({
            where: {
                OR: [
                    {
                        titleEnglish: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                    {
                        titleArabic: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                    {
                        textEnglish: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                ],
            },
            include: {
                category: true,
            },
        });
    }
    async createCustomDua(createDuaDto) {
        return { success: true, message: 'Custom duas coming soon' };
    }
    async addFavorite(userId, duaId) {
        return this.prisma.userFavoriteDua.upsert({
            where: {
                userId_duaId: {
                    userId,
                    duaId,
                },
            },
            create: {
                userId,
                duaId,
            },
            update: {},
        });
    }
    async getFavorites(userId) {
        const favorites = await this.prisma.userFavoriteDua.findMany({
            where: { userId },
        });
        const duaIds = favorites.map((f) => f.duaId);
        if (duaIds.length === 0) {
            return [];
        }
        return this.prisma.dua.findMany({
            where: {
                id: { in: duaIds },
            },
            include: {
                category: true,
            },
        });
    }
    async getDailyDua() {
        const count = await this.prisma.dua.count();
        if (count === 0) {
            return null;
        }
        const today = new Date();
        const start = new Date(today.getFullYear(), 0, 0);
        const diff = today.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        const offset = dayOfYear % count;
        const results = await this.prisma.dua.findMany({
            skip: offset,
            take: 1,
            include: {
                category: true,
            },
        });
        return results[0] ?? null;
    }
};
exports.DuasService = DuasService;
exports.DuasService = DuasService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DuasService);
//# sourceMappingURL=duas.service.js.map