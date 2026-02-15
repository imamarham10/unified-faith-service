export declare class ConvertToHijriDto {
    date?: string;
    timezone?: string;
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
}
export declare class GetHijriMonthDto {
    year: number;
    month: number;
    timezone?: string;
}
export declare class GetUpcomingEventsDto {
    days?: number;
    timezone?: string;
}
export declare class GetTodayDto {
    timezone?: string;
}
