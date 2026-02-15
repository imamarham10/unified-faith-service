export declare class EmotionResponseDto {
    id: string;
    name: string;
    slug: string;
    icon?: string;
}
export declare class EmotionDetailResponseDto extends EmotionResponseDto {
    remedies: EmotionRemedyDto[];
}
export declare class EmotionRemedyDto {
    id: string;
    arabicText: string;
    transliteration?: string;
    translation: string;
    source: string;
}
