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
exports.DhikrService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../common/utils/prisma.service");
let DhikrService = class DhikrService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCounters(userId) {
        return this.prisma.dhikrCounter.findMany({
            where: { userId, isActive: true },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async createCounter(userId, data) {
        return this.prisma.dhikrCounter.create({
            data: {
                userId,
                name: data.name,
                phrase: data.phrase,
                targetCount: data.targetCount,
            },
        });
    }
    async incrementCounter(id, count = 1) {
        const counter = await this.prisma.dhikrCounter.findUnique({
            where: { id },
        });
        if (!counter) {
            throw new common_1.NotFoundException('Counter not found');
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.prisma.$transaction(async (tx) => {
            const updatedCounter = await tx.dhikrCounter.update({
                where: { id },
                data: { count: { increment: count } }
            });
            await tx.dhikrHistory.upsert({
                where: {
                    userId_phrase_date: {
                        userId: counter.userId,
                        phrase: counter.phrase,
                        date: today,
                    }
                },
                update: {
                    count: { increment: count }
                },
                create: {
                    userId: counter.userId,
                    phrase: counter.phrase,
                    date: today,
                    count: count
                }
            });
            return updatedCounter;
        });
    }
    async deleteCounter(id) {
        return this.prisma.dhikrCounter.delete({
            where: { id }
        });
    }
    async createGoal(userId, data) {
        const today = new Date();
        const start = new Date(today);
        let end = data.endDate ? new Date(data.endDate) : new Date(today);
        if (!data.endDate) {
            if (data.period === 'weekly')
                end.setDate(end.getDate() + 7);
            else if (data.period === 'monthly')
                end.setMonth(end.getMonth() + 1);
            else
                end.setDate(end.getDate() + 1);
        }
        return this.prisma.dhikrGoal.create({
            data: {
                userId,
                phrase: data.phrase,
                targetCount: data.targetCount,
                period: data.period,
                startDate: start,
                endDate: end,
            }
        });
    }
    async getGoals(userId) {
        const today = new Date();
        return this.prisma.dhikrGoal.findMany({
            where: {
                userId,
                endDate: { gte: today }
            }
        });
    }
    async getStats(userId) {
        const history = await this.prisma.dhikrHistory.aggregate({
            where: { userId },
            _sum: { count: true }
        });
        const byPhrase = await this.prisma.dhikrHistory.groupBy({
            by: ['phrase'],
            where: { userId },
            _sum: { count: true }
        });
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const recentActivity = await this.prisma.dhikrHistory.findMany({
            where: {
                userId,
                date: { gte: lastWeek }
            },
            orderBy: { date: 'asc' }
        });
        return {
            totalDhikr: history._sum.count || 0,
            byPhrase: byPhrase.map(p => ({ phrase: p.phrase, count: p._sum.count })),
            recentActivity
        };
    }
};
exports.DhikrService = DhikrService;
exports.DhikrService = DhikrService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DhikrService);
//# sourceMappingURL=dhikr.service.js.map