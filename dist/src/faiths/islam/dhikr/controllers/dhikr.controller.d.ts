import { DhikrService } from '../services/dhikr.service';
import { DhikrDictionaryService } from '../services/dhikr-dictionary.service';
import { CreateCounterDto, CreateGoalDto, UpdateCounterDto } from '../dto/dhikr.dto';
import { CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
export declare class DhikrController {
    private readonly dhikrService;
    private readonly dictionaryService;
    constructor(dhikrService: DhikrService, dictionaryService: DhikrDictionaryService);
    getCounters(user: CurrentUserData): Promise<{
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
    createCounter(user: CurrentUserData, body: CreateCounterDto): Promise<{
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
    incrementCounter(id: string, body: UpdateCounterDto): Promise<{
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
    createGoal(user: CurrentUserData, body: CreateGoalDto): Promise<{
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
    getGoals(user: CurrentUserData): Promise<{
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
    getStats(user: CurrentUserData): Promise<{
        totalDhikr: number;
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
    getAvailablePhrases(): Promise<import("../constants/dhikr-phrases.constant").DhikrPhrase[]>;
}
