import { FeelingsService } from '../services/feelings.service';
export declare class FeelingsController {
    private readonly feelingsService;
    constructor(feelingsService: FeelingsService);
    getAllEmotions(): Promise<import("../dto/feelings.dto").EmotionResponseDto[]>;
    getEmotionBySlug(slug: string): Promise<import("../dto/feelings.dto").EmotionDetailResponseDto>;
}
