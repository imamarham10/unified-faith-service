export declare class CreateCounterDto {
    name: string;
    phrase: string;
    targetCount?: number;
}
export declare class UpdateCounterDto {
    count?: number;
}
export declare class CreateGoalDto {
    phrase: string;
    targetCount: number;
    period: string;
    endDate?: string;
}
export declare class DhikrCounterResponseDto {
    id: string;
    userId: string;
    name: string;
    phraseArabic: string;
    phraseTranslit?: string;
    phraseEnglish: string;
    count: number;
    targetCount?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class DhikrGoalResponseDto {
    id: string;
    userId: string;
    phraseArabic: string;
    phraseTranslit?: string;
    phraseEnglish: string;
    targetCount: number;
    period: string;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
}
export declare class DhikrHistoryResponseDto {
    id: string;
    userId: string;
    phraseArabic: string;
    phraseTranslit?: string;
    phraseEnglish: string;
    count: number;
    date: Date;
    createdAt: Date;
}
