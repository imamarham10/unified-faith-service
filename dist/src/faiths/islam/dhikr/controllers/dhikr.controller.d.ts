import { DhikrService } from '../services/dhikr.service';
import { CreateCounterDto, CreateGoalDto, UpdateCounterDto } from '../dto/dhikr.dto';
import { CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
export declare class DhikrController {
    private readonly dhikrService;
    constructor(dhikrService: DhikrService);
    getCounters(user: CurrentUserData): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isActive: boolean;
        phrase: string;
        count: number;
        targetCount: number | null;
    }[]>;
    createCounter(user: CurrentUserData, body: CreateCounterDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isActive: boolean;
        phrase: string;
        count: number;
        targetCount: number | null;
    }>;
    incrementCounter(id: string, body: UpdateCounterDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isActive: boolean;
        phrase: string;
        count: number;
        targetCount: number | null;
    }>;
    deleteCounter(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isActive: boolean;
        phrase: string;
        count: number;
        targetCount: number | null;
    }>;
    createGoal(user: CurrentUserData, body: CreateGoalDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        phrase: string;
        targetCount: number;
        period: string;
        startDate: Date;
        endDate: Date;
    }>;
    getGoals(user: CurrentUserData): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        phrase: string;
        targetCount: number;
        period: string;
        startDate: Date;
        endDate: Date;
    }[]>;
    getStats(user: CurrentUserData): Promise<{
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
