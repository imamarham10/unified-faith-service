import { PrismaService } from '../../../../common/utils/prisma.service';
export declare class DhikrService {
    private prisma;
    constructor(prisma: PrismaService);
    getCounters(userId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isActive: boolean;
        phrase: string;
        count: number;
        targetCount: number | null;
    }[]>;
    createCounter(userId: string, data: {
        name: string;
        phrase: string;
        targetCount?: number;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isActive: boolean;
        phrase: string;
        count: number;
        targetCount: number | null;
    }>;
    incrementCounter(id: string, count?: number): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isActive: boolean;
        phrase: string;
        count: number;
        targetCount: number | null;
    }>;
    deleteCounter(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isActive: boolean;
        phrase: string;
        count: number;
        targetCount: number | null;
    }>;
    createGoal(userId: string, data: {
        phrase: string;
        targetCount: number;
        period: string;
        endDate?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        phrase: string;
        targetCount: number;
        period: string;
        startDate: Date;
        endDate: Date;
    }>;
    getGoals(userId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        phrase: string;
        targetCount: number;
        period: string;
        startDate: Date;
        endDate: Date;
    }[]>;
    getStats(userId: string): Promise<{
        totalDhikr: number;
        byPhrase: {
            phrase: string;
            count: number;
        }[];
        recentActivity: {
            id: string;
            createdAt: Date;
            userId: string;
            date: Date;
            phrase: string;
            count: number;
        }[];
    }>;
}
