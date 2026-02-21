import { Cache } from 'cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';
export interface HijriDateInfo {
    hijriDay: number;
    hijriMonth: number;
    hijriYear: number;
    hijriMonthName: string;
    gregorianDate: string;
    dayOfWeek: string;
    events?: Array<{
        name: string;
        nameArabic?: string;
        description?: string;
        importance: string;
    }>;
}
export interface CalendarMonth {
    month: number;
    year: number;
    monthName: string;
    days: HijriDateInfo[];
}
export declare class CalendarService {
    private prisma;
    private cacheManager;
    private readonly hijriMonthNames;
    private readonly hijriMonthNamesArabic;
    private readonly dayNames;
    constructor(prisma: PrismaService, cacheManager: Cache);
    private aladhanGToH;
    private getDateInTimezone;
    private extractDateInTimezone;
    gregorianToHijri(date: Date, timezone?: string, calendarAdjust?: number): Promise<HijriDateInfo>;
    hijriToGregorian(year: number, month: number, day: number, timezone?: string): Promise<HijriDateInfo>;
    getGregorianMonthCalendar(year: number, month: number, timezone?: string, calendarAdjust?: number): Promise<CalendarMonth>;
    getHijriMonthCalendar(year: number, month: number, timezone?: string): Promise<CalendarMonth>;
    getToday(timezone?: string, calendarAdjust?: number): Promise<HijriDateInfo>;
    getAllEvents(): Promise<any>;
    private localGregorianToHijriNumbers;
    private toJulianDay;
    private julianDayToHijri;
    getUpcomingEvents(days?: number, timezone?: string, calendarAdjust?: number): Promise<any>;
    private getEventsForHijriDate;
    private getHijriMonthLength;
    getHijriMonthNames(): {
        number: number;
        nameEnglish: string;
        nameArabic: string;
    }[];
}
