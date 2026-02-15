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
    private readonly hijriMonthNames;
    private readonly hijriMonthNamesArabic;
    private readonly dayNames;
    constructor(prisma: PrismaService);
    private getDateInTimezone;
    gregorianToHijri(date: Date, timezone?: string): Promise<HijriDateInfo>;
    hijriToGregorian(year: number, month: number, day: number, timezone?: string): Promise<HijriDateInfo>;
    getGregorianMonthCalendar(year: number, month: number, timezone?: string): Promise<CalendarMonth>;
    getHijriMonthCalendar(year: number, month: number, timezone?: string): Promise<CalendarMonth>;
    getToday(timezone?: string): Promise<HijriDateInfo>;
    getAllEvents(): Promise<{
        name: string;
        id: string;
        nameArabic: string | null;
        description: string | null;
        hijriMonth: number;
        hijriDay: number;
        importance: string;
    }[]>;
    getUpcomingEvents(days?: number, timezone?: string): Promise<{
        event: any;
        gregorianDate: string;
        daysUntil: number;
    }[]>;
    private getEventsForHijriDate;
    private getHijriMonthLength;
    getHijriMonthNames(): {
        number: number;
        nameEnglish: string;
        nameArabic: string;
    }[];
}
