import { PrismaService } from '../../../../common/utils/prisma.service';
import { PrayerCalculationsService } from './prayer-calculations.service';
export declare class PrayersService {
    private prisma;
    private prayerCalculations;
    constructor(prisma: PrismaService, prayerCalculations: PrayerCalculationsService);
    getPrayerTimes(lat: number, lng: number, dateStr?: string, method?: string): Promise<{
        date: string;
        location: {
            lat: number;
            lng: number;
        };
        method: string;
        times: {
            fajr: string;
            sunrise: string;
            dhuhr: string;
            asr: string;
            maghrib: string;
            isha: string;
        };
    }>;
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
    getPrayerStats(userId: string): Promise<{
        userId: string;
        totalPrayers: number;
        onTimePrayers: number;
        streak: number;
    }>;
    private calculateTimeDifference;
}
