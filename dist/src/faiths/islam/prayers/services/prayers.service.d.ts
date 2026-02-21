import { Cache } from 'cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { PrayerCalculationsService } from './prayer-calculations.service';
export declare class PrayersService {
    private prisma;
    private prayerCalculations;
    private cacheManager;
    constructor(prisma: PrismaService, prayerCalculations: PrayerCalculationsService, cacheManager: Cache);
    getPrayerTimes(lat: number, lng: number, dateStr?: string, method?: string): Promise<any>;
    getCurrentPrayer(lat: number, lng: number, method?: string): Promise<{
        current: "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha" | "none";
        next: "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha" | "none";
        date: string;
        remainingTime: string;
    }>;
    logPrayer(userId: string, data: {
        prayerName: string;
        date: string;
        status: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        date: Date;
        prayerName: string;
        loggedAt: Date;
        status: string;
    }>;
    getPrayerLogs(userId: string, fromDate?: string, toDate?: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        date: Date;
        prayerName: string;
        loggedAt: Date;
        status: string;
    }[]>;
    deletePrayerLog(userId: string, logId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        date: Date;
        prayerName: string;
        loggedAt: Date;
        status: string;
    }>;
    getPrayerStats(userId: string): Promise<{
        userId: string;
        totalPrayers: number;
        onTimePrayers: number;
        streak: number;
    }>;
    private calculateTimeDifference;
}
