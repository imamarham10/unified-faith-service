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
exports.NamesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../common/utils/prisma.service");
let NamesService = class NamesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAllNames() {
        return this.prisma.allahName.findMany({
            orderBy: {
                id: 'asc',
            },
        });
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
        return this.prisma.muhammadName.findMany({
            orderBy: {
                id: 'asc',
            },
        });
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NamesService);
//# sourceMappingURL=names.service.js.map