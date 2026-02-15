import { CalendarService } from '../services/calendar.service';
export declare class CalendarController {
    private readonly calendarService;
    constructor(calendarService: CalendarService);
    getHijriDate(date: string): Promise<{
        gregorian: string;
        hijri: {
            day: number;
            month: number;
            year: number;
        };
    }>;
    convertDate(date: string, to: string): Promise<{
        converted: string;
    }>;
    getEvents(): Promise<any[]>;
    getUpcomingEvents(): Promise<any[]>;
}
