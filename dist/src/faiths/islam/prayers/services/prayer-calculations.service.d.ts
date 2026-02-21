export declare class PrayerCalculationsService {
    calculatePrayerTimes(lat: number, lng: number, date: Date, methodSlug?: string, madhab?: 'shafi' | 'hanafi'): {
        fajr: Date;
        sunrise: Date;
        dhuhr: Date;
        asr: Date;
        maghrib: Date;
        isha: Date;
    };
    getCurrentPrayer(lat: number, lng: number, date?: Date, methodSlug?: string): {
        current: "none" | "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
        next: "none" | "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
        times: {
            fajr: Date;
            sunrise: Date;
            dhuhr: Date;
            asr: Date;
            maghrib: Date;
            isha: Date;
        };
    };
    getQiblaDirection(lat: number, lng: number): number;
    private getCalculationMethod;
}
