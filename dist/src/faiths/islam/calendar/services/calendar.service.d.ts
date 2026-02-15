import { PrismaService } from '../../../../common/utils/prisma.service';
export declare class CalendarService {
    private prisma;
    constructor(prisma: PrismaService);
    getHijriDate(gregorianDate: string): Promise<{
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
