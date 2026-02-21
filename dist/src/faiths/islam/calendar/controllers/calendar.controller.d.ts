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
    getAllEvents(): Promise<any>;
    getUpcomingEvents(query: GetUpcomingEventsDto): Promise<any>;
    getHijriMonths(): Promise<{
        number: number;
        nameEnglish: string;
        nameArabic: string;
    }[]>;
}
