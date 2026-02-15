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
