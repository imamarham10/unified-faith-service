export declare class ConvertToHijriDto {
    date?: string;
    timezone?: string;
    calendarAdjust?: number;
}
export declare class ConvertToGregorianDto {
    year: number;
    month: number;
    day: number;
    timezone?: string;
}
export declare class GetGregorianMonthDto {
    year: number;
    month: number;
    timezone?: string;
    calendarAdjust?: number;
}
export declare class GetHijriMonthDto {
    year: number;
    month: number;
    timezone?: string;
}
export declare class GetUpcomingEventsDto {
    days?: number;
    timezone?: string;
    calendarAdjust?: number;
}
export declare class GetTodayDto {
    timezone?: string;
    calendarAdjust?: number;
}
