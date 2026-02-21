export interface DhikrPhrase {
    arabic: string;
    transliteration: string;
    english: string;
    category?: string;
}
export declare const COMMON_DHIKR_PHRASES: DhikrPhrase[];
export declare function normalizeArabic(text: string): string;
export declare function normalizeEnglish(text: string): string;
export declare const DHIKR_BY_ARABIC: Map<string, DhikrPhrase>;
export declare const DHIKR_BY_ENGLISH: Map<string, DhikrPhrase>;
export declare const DHIKR_BY_TRANSLITERATION: Map<string, DhikrPhrase>;
