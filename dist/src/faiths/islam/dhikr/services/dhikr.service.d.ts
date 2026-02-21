import { PrismaService } from '../../../../common/utils/prisma.service';
import { DhikrDictionaryService } from './dhikr-dictionary.service';
export declare class DhikrService {
    private prisma;
    private dictionaryService;
    constructor(prisma: PrismaService, dictionaryService: DhikrDictionaryService);
    getCounters(userId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string;
        phraseArabic: string;
        phraseTranslit: string | null;
        phraseEnglish: string;
        count: number;
        targetCount: number | null;
    }[]>;
    createCounter(userId: string, data: {
        name: string;
        phrase: string;
        targetCount?: number;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string;
        phraseArabic: string;
        phraseTranslit: string | null;
        phraseEnglish: string;
        count: number;
        targetCount: number | null;
    }>;
    incrementCounter(id: string, count?: number): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string;
        phraseArabic: string;
        phraseTranslit: string | null;
        phraseEnglish: string;
        count: number;
        targetCount: number | null;
    }>;
    deleteCounter(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string;
        phraseArabic: string;
        phraseTranslit: string | null;
        phraseEnglish: string;
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
        phraseArabic: string;
        phraseTranslit: string | null;
        phraseEnglish: string;
        targetCount: number;
        period: string;
        startDate: Date;
        endDate: Date;
    }>;
    getGoals(userId: string): Promise<{
        currentCount: number;
        progressPercent: number;
        daysRemaining: number;
        isComplete: boolean;
        id: string;
        createdAt: Date;
        userId: string;
        phraseArabic: string;
        phraseTranslit: string | null;
        phraseEnglish: string;
        targetCount: number;
        period: string;
        startDate: Date;
        endDate: Date;
    }[]>;
    getStats(userId: string): Promise<{
        totalCount: number;
        totalDhikr: number;
        currentStreak: number;
        longestStreak: number;
        dailyAverage: number;
        mostRecitedPhrase: string;
        byPhrase: {
            phraseArabic: string;
            phraseEnglish: string;
            count: number;
        }[];
        recentActivity: {
            id: string;
            createdAt: Date;
            userId: string;
            date: Date;
            phraseArabic: string;
            phraseTranslit: string | null;
            phraseEnglish: string;
            count: number;
        }[];
    }>;
    getHistory(userId: string, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        date: Date;
        phraseArabic: string;
        phraseTranslit: string | null;
        phraseEnglish: string;
        count: number;
    }[]>;
}
