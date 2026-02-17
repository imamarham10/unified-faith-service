import { PrayersService } from '../services/prayers.service';
import { GetPrayerTimesDto, LogPrayerDto } from '../dto/prayers.dto';
import { CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
export declare class PrayersController {
    private readonly prayersService;
    constructor(prayersService: PrayersService);
    getPrayerTimes(query: GetPrayerTimesDto): Promise<{
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
    getCurrentPrayer(lat: string, lng: string, method?: string): Promise<{
        current: "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha" | "none";
        next: "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha" | "none";
        date: string;
        remainingTime: string;
    }>;
    logPrayer(user: CurrentUserData, body: LogPrayerDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        date: Date;
        prayerName: string;
        loggedAt: Date;
        status: string;
    }>;
    getPrayerLogs(user: CurrentUserData, fromDate?: string, toDate?: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        date: Date;
        prayerName: string;
        loggedAt: Date;
        status: string;
    }[]>;
    getPrayerStats(user: CurrentUserData): Promise<{
        userId: string;
        totalPrayers: number;
        onTimePrayers: number;
        streak: number;
    }>;
}
