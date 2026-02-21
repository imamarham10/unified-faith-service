import { PrayersService } from '../services/prayers.service';
import { GetPrayerTimesDto, LogPrayerDto } from '../dto/prayers.dto';
import { CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
export declare class PrayersController {
    private readonly prayersService;
    constructor(prayersService: PrayersService);
    getPrayerTimes(query: GetPrayerTimesDto): Promise<any>;
    getCurrentPrayer(lat: string, lng: string, method?: string): Promise<{
        current: "none" | "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
        next: "none" | "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
        date: string;
        remainingTime: string;
    }>;
    logPrayer(user: CurrentUserData, body: LogPrayerDto): Promise<{
        date: Date;
        id: string;
        createdAt: Date;
        userId: string;
        prayerName: string;
        loggedAt: Date;
        status: string;
    }>;
    getPrayerLogs(user: CurrentUserData, fromDate?: string, toDate?: string): Promise<{
        date: Date;
        id: string;
        createdAt: Date;
        userId: string;
        prayerName: string;
        loggedAt: Date;
        status: string;
    }[]>;
    deletePrayerLog(user: CurrentUserData, id: string): Promise<{
        date: Date;
        id: string;
        createdAt: Date;
        userId: string;
        prayerName: string;
        loggedAt: Date;
        status: string;
    }>;
    getPrayerStats(user: CurrentUserData): Promise<{
        userId: string;
        totalPrayers: number;
        onTimePrayers: number;
        streak: number;
    }>;
}
