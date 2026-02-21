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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamesService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const common_2 = require("@nestjs/common");
const prisma_service_1 = require("../../../../common/utils/prisma.service");
const CACHE_TTL = {
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
};
let NamesService = class NamesService {
    constructor(prisma, cacheManager) {
        this.prisma = prisma;
        this.cacheManager = cacheManager;
    }
    async getAllNames() {
        const cacheKey = 'names:allah';
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const result = await this.prisma.allahName.findMany({
            orderBy: { id: 'asc' },
        });
        await this.cacheManager.set(cacheKey, result, CACHE_TTL.WEEK);
        return result;
    }
    async getName(id) {
        const name = await this.prisma.allahName.findUnique({
            where: { id },
        });
        if (!name) {
            throw new Error(`Name with ID ${id} not found`);
        }
        return name;
    }
    async addFavorite(userId, nameId) {
        const name = await this.getName(nameId);
        return this.prisma.userFavoriteAllahName.create({
            data: {
                userId,
                nameId,
            },
        });
    }
    async getDailyName() {
        const today = new Date();
        const start = new Date(today.getFullYear(), 0, 0);
        const diff = today.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        const id = (dayOfYear % 99) + 1;
        return this.getName(id);
    }
    async getAllMuhammadNames() {
        const cacheKey = 'names:muhammad';
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const result = await this.prisma.muhammadName.findMany({
            orderBy: { id: 'asc' },
        });
        await this.cacheManager.set(cacheKey, result, CACHE_TTL.WEEK);
        return result;
    }
    async getMuhammadName(id) {
        const name = await this.prisma.muhammadName.findUnique({
            where: { id },
        });
        if (!name) {
            throw new Error(`Muhammad's name with ID ${id} not found`);
        }
        return name;
    }
    async addMuhammadFavorite(userId, nameId) {
        await this.getMuhammadName(nameId);
        return this.prisma.userFavoriteMuhammadName.create({
            data: {
                userId,
                nameId,
            },
        });
    }
    async getDailyMuhammadName() {
        const today = new Date();
        const start = new Date(today.getFullYear(), 0, 0);
        const diff = today.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        const id = (dayOfYear % 99) + 1;
        return this.getMuhammadName(id);
    }
    async getUserMuhammadFavorites(userId) {
        const favorites = await this.prisma.userFavoriteMuhammadName.findMany({
            where: { userId },
        });
        const nameIds = favorites.map((f) => f.nameId);
        if (nameIds.length === 0) {
            return [];
        }
        return this.prisma.muhammadName.findMany({
            where: { id: { in: nameIds } },
            orderBy: { id: 'asc' },
        });
    }
};
exports.NamesService = NamesService;
exports.NamesService = NamesService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_2.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], NamesService);
//# sourceMappingURL=names.service.js.map