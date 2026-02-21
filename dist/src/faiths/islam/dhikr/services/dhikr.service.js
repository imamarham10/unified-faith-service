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
const dhikr_dictionary_service_1 = require("./dhikr-dictionary.service");
let DhikrService = class DhikrService {
    constructor(prisma, dictionaryService) {
        this.prisma = prisma;
        this.dictionaryService = dictionaryService;
    }
    async getCounters(userId) {
        return this.prisma.dhikrCounter.findMany({
            where: { userId, isActive: true },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async createCounter(userId, data) {
        const resolvedPhrase = this.dictionaryService.resolvePhrase(data.phrase);
        return this.prisma.dhikrCounter.create({
            data: {
                userId,
                name: data.name,
                phraseArabic: resolvedPhrase.arabic,
                phraseTranslit: resolvedPhrase.transliteration,
                phraseEnglish: resolvedPhrase.english,
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
                data: { count: { increment: count } },
            });
            await tx.dhikrHistory.upsert({
                where: {
                    userId_phraseArabic_date: {
                        userId: counter.userId,
                        phraseArabic: counter.phraseArabic,
                        date: today,
                    },
                },
                update: {
                    count: { increment: count },
                },
                create: {
                    userId: counter.userId,
                    phraseArabic: counter.phraseArabic,
                    phraseTranslit: counter.phraseTranslit,
                    phraseEnglish: counter.phraseEnglish,
                    date: today,
                    count: count,
                },
            });
            return updatedCounter;
        });
    }
    async deleteCounter(id) {
        return this.prisma.dhikrCounter.delete({
            where: { id },
        });
    }
    async createGoal(userId, data) {
        const resolvedPhrase = this.dictionaryService.resolvePhrase(data.phrase);
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
                phraseArabic: resolvedPhrase.arabic,
                phraseTranslit: resolvedPhrase.transliteration,
                phraseEnglish: resolvedPhrase.english,
                targetCount: data.targetCount,
                period: data.period,
                startDate: start,
                endDate: end,
            },
        });
    }
    async getGoals(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const goals = await this.prisma.dhikrGoal.findMany({
            where: {
                userId,
                endDate: { gte: today },
            },
            orderBy: { createdAt: 'desc' },
        });
        return Promise.all(goals.map(async (goal) => {
            let progressFrom;
            if (goal.period === 'daily') {
                progressFrom = new Date(today);
            }
            else {
                progressFrom = new Date(goal.startDate);
                progressFrom.setHours(0, 0, 0, 0);
            }
            const progressResult = await this.prisma.dhikrHistory.aggregate({
                where: {
                    userId,
                    phraseArabic: goal.phraseArabic,
                    date: { gte: progressFrom },
                },
                _sum: { count: true },
            });
            const currentCount = progressResult._sum.count || 0;
            const progressPercent = Math.min(Math.round((currentCount / goal.targetCount) * 100), 100);
            const endDate = new Date(goal.endDate);
            endDate.setHours(23, 59, 59, 999);
            const msLeft = endDate.getTime() - today.getTime();
            const daysRemaining = Math.max(0, Math.ceil(msLeft / 86400000));
            return {
                ...goal,
                currentCount,
                progressPercent,
                daysRemaining,
                isComplete: currentCount >= goal.targetCount,
            };
        }));
    }
    async getStats(userId) {
        const historyAggregate = await this.prisma.dhikrHistory.aggregate({
            where: { userId },
            _sum: { count: true },
        });
        const totalCount = historyAggregate._sum.count || 0;
        const byPhrase = await this.prisma.dhikrHistory.groupBy({
            by: ['phraseArabic', 'phraseEnglish'],
            where: { userId },
            _sum: { count: true },
            orderBy: { _sum: { count: 'desc' } },
        });
        const mostRecitedPhrase = byPhrase.length > 0 ? (byPhrase[0].phraseEnglish || null) : null;
        const allHistory = await this.prisma.dhikrHistory.findMany({
            where: { userId },
            select: { date: true },
            orderBy: { date: 'desc' },
        });
        const activeDays = allHistory.length;
        const dailyAverage = activeDays > 0 ? Math.round(totalCount / activeDays) : 0;
        const ONE_DAY = 86400000;
        let currentStreak = 0;
        let longestStreak = 0;
        if (allHistory.length > 0) {
            const rawTimestamps = allHistory.map((h) => {
                const d = new Date(h.date);
                d.setHours(0, 0, 0, 0);
                return d.getTime();
            });
            const uniqueDates = [...new Set(rawTimestamps)].sort((a, b) => b - a);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayMs = today.getTime();
            const yesterdayMs = todayMs - ONE_DAY;
            if (uniqueDates[0] >= yesterdayMs) {
                currentStreak = 1;
                for (let i = 1; i < uniqueDates.length; i++) {
                    if (uniqueDates[i] === uniqueDates[i - 1] - ONE_DAY) {
                        currentStreak++;
                    }
                    else {
                        break;
                    }
                }
            }
            let run = 1;
            longestStreak = 1;
            for (let i = 1; i < uniqueDates.length; i++) {
                if (uniqueDates[i] === uniqueDates[i - 1] - ONE_DAY) {
                    run++;
                    if (run > longestStreak)
                        longestStreak = run;
                }
                else {
                    run = 1;
                }
            }
        }
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const recentActivity = await this.prisma.dhikrHistory.findMany({
            where: { userId, date: { gte: lastWeek } },
            orderBy: { date: 'asc' },
        });
        return {
            totalCount,
            totalDhikr: totalCount,
            currentStreak,
            longestStreak,
            dailyAverage,
            mostRecitedPhrase,
            byPhrase: byPhrase.map((p) => ({
                phraseArabic: p.phraseArabic,
                phraseEnglish: p.phraseEnglish,
                count: p._sum.count || 0,
            })),
            recentActivity,
        };
    }
    async getHistory(userId, limit = 30) {
        return this.prisma.dhikrHistory.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            take: limit,
        });
    }
};
exports.DhikrService = DhikrService;
exports.DhikrService = DhikrService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        dhikr_dictionary_service_1.DhikrDictionaryService])
], DhikrService);
//# sourceMappingURL=dhikr.service.js.map