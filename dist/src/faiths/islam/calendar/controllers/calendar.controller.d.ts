import { CalendarService } from '../services/calendar.service';
import { ConvertToHijriDto, ConvertToGregorianDto, GetGregorianMonthDto, GetHijriMonthDto, GetUpcomingEventsDto, GetTodayDto } from '../dto/calendar.dto';
export declare class CalendarController {
    private readonly calendarService;
    constructor(calendarService: CalendarService);
    getToday(query: GetTodayDto): Promise<import("../services/calendar.service").HijriDateInfo>;
    convertToHijri(query: ConvertToHijriDto): Promise<import("../services/calendar.service").HijriDateInfo>;
    convertToGregorian(query: ConvertToGregorianDto): Promise<import("../services/calendar.service").HijriDateInfo>;
    getGregorianMonth(query: GetGregorianMonthDto): Promise<import("../services/calendar.service").CalendarMonth>;
    getHijriMonth(query: GetHijriMonthDto): Promise<import("../services/calendar.service").CalendarMonth>;
    getAllEvents(): Promise<{
        name: string;
        id: string;
        nameArabic: string | null;
        description: string | null;
        hijriMonth: number;
        hijriDay: number;
        importance: string;
    }[]>;
    getUpcomingEvents(query: GetUpcomingEventsDto): Promise<{
        event: any;
        gregorianDate: string;
        daysUntil: number;
    }[]>;
    getHijriMonths(): Promise<{
        number: number;
        nameEnglish: string;
        nameArabic: string;
    }[]>;
}
