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
exports.PrayersService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const prisma_service_1 = require("../../../../common/utils/prisma.service");
const prayer_calculations_service_1 = require("./prayer-calculations.service");
const PRAYER_CACHE_TTL = 24 * 60 * 60 * 1000;
let PrayersService = class PrayersService {
    constructor(prisma, prayerCalculations, cacheManager) {
        this.prisma = prisma;
        this.prayerCalculations = prayerCalculations;
        this.cacheManager = cacheManager;
    }
    async getPrayerTimes(lat, lng, dateStr, method = 'mwl') {
        const latKey = lat.toFixed(4);
        const lngKey = lng.toFixed(4);
        const dateKey = dateStr || new Date().toISOString().split('T')[0];
        const cacheKey = `prayers:${latKey}:${lngKey}:${dateKey}:${method}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const date = dateStr ? new Date(dateStr) : new Date();
        if (isNaN(date.getTime())) {
            throw new common_1.BadRequestException('Invalid date format');
        }
        const times = this.prayerCalculations.calculatePrayerTimes(lat, lng, date, method);
        const result = {
            date: date.toISOString().split('T')[0],
            location: { lat, lng },
            method,
            times: {
                fajr: times.fajr.toISOString(),
                sunrise: times.sunrise.toISOString(),
                dhuhr: times.dhuhr.toISOString(),
                asr: times.asr.toISOString(),
                maghrib: times.maghrib.toISOString(),
                isha: times.isha.toISOString(),
            },
        };
        await this.cacheManager.set(cacheKey, result, PRAYER_CACHE_TTL);
        return result;
    }
    async getCurrentPrayer(lat, lng, method = 'mwl') {
        const date = new Date();
        const result = this.prayerCalculations.getCurrentPrayer(lat, lng, date, method);
        return {
            current: result.current,
            next: result.next,
            date: date.toISOString(),
            remainingTime: result.next ? this.calculateTimeDifference(new Date(), result.times[result.next]) : null
        };
    }
    async logPrayer(userId, data) {
        const prayerDate = new Date(data.date);
        return this.prisma.prayerLog.upsert({
            where: {
                userId_prayerName_date: {
                    userId,
                    prayerName: data.prayerName,
                    date: prayerDate,
                },
            },
            update: {
                status: data.status,
                loggedAt: new Date(),
            },
            create: {
                userId,
                prayerName: data.prayerName,
                date: prayerDate,
                status: data.status,
                loggedAt: new Date(),
            },
        });
    }
    async getPrayerLogs(userId, fromDate, toDate) {
        const where = { userId };
        if (fromDate || toDate) {
            where.date = {};
            if (fromDate)
                where.date.gte = new Date(fromDate);
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                where.date.lte = end;
            }
        }
        return this.prisma.prayerLog.findMany({
            where,
            orderBy: { date: 'desc' },
            take: 100
        });
    }
    async deletePrayerLog(userId, logId) {
        const log = await this.prisma.prayerLog.findFirst({
            where: { id: logId, userId },
        });
        if (!log) {
            throw new common_1.BadRequestException('Prayer log not found');
        }
        return this.prisma.prayerLog.delete({
            where: { id: logId },
        });
    }
    async getPrayerStats(userId) {
        const totalPrayers = await this.prisma.prayerLog.count({
            where: { userId }
        });
        const onTimePrayers = await this.prisma.prayerLog.count({
            where: { userId, status: 'on_time' }
        });
        const logs = await this.prisma.prayerLog.findMany({
            where: { userId },
            select: { date: true },
            distinct: ['date'],
            orderBy: { date: 'desc' },
            take: 30
        });
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (logs.length > 0) {
            let currentDate = new Date(logs[0].date);
            const timeDiff = today.getTime() - currentDate.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
            if (daysDiff <= 1) {
                streak = 1;
                for (let i = 0; i < logs.length - 1; i++) {
                    const curr = new Date(logs[i].date);
                    const prev = new Date(logs[i + 1].date);
                    const diff = (curr.getTime() - prev.getTime()) / (1000 * 3600 * 24);
                    if (Math.round(diff) === 1) {
                        streak++;
                    }
                    else {
                        break;
                    }
                }
            }
        }
        return {
            userId,
            totalPrayers,
            onTimePrayers,
            streak,
        };
    }
    calculateTimeDifference(now, target) {
        if (!target)
            return null;
        const diffMs = target.getTime() - now.getTime();
        if (diffMs < 0)
            return '00:00:00';
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
};
exports.PrayersService = PrayersService;
exports.PrayersService = PrayersService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        prayer_calculations_service_1.PrayerCalculationsService, Object])
], PrayersService);
//# sourceMappingURL=prayers.service.js.map