import { PrismaService } from '../../../../common/utils/prisma.service';
export declare class QuranService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllSurahs(): Promise<{
        id: number;
        nameArabic: string;
        nameEnglish: string;
        nameTransliteration: string;
        revelationPlace: string;
        verseCount: number;
    }[]>;
    getSurah(surahId: number, language?: string): Promise<{
        verses: ({
            translations: {
                id: string;
                text: string;
                language: string;
                verseId: string;
                authorName: string;
            }[];
        } & {
            id: string;
            textArabic: string;
            surahId: number;
            verseNumber: number;
            textSimple: string;
        })[];
    } & {
        id: number;
        nameArabic: string;
        nameEnglish: string;
        nameTransliteration: string;
        revelationPlace: string;
        verseCount: number;
    }>;
    getVerse(verseKey: string, language?: string): Promise<{
        surah: {
            id: number;
            nameArabic: string;
            nameEnglish: string;
            nameTransliteration: string;
            revelationPlace: string;
            verseCount: number;
        };
        translations: {
            id: string;
            text: string;
            language: string;
            verseId: string;
            authorName: string;
        }[];
    } & {
        id: string;
        textArabic: string;
        surahId: number;
        verseNumber: number;
        textSimple: string;
    }>;
    searchVerses(query: string, language?: string): Promise<({
        surah: {
            id: number;
            nameArabic: string;
            nameEnglish: string;
            nameTransliteration: string;
            revelationPlace: string;
            verseCount: number;
        };
        translations: {
            id: string;
            text: string;
            language: string;
            verseId: string;
            authorName: string;
        }[];
    } & {
        id: string;
        textArabic: string;
        surahId: number;
        verseNumber: number;
        textSimple: string;
    })[]>;
    addBookmark(userId: string, data: {
        surahId: number;
        verseNumber: number;
        note?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        surahId: number;
        verseNumber: number;
        userId: string;
        note: string | null;
    }>;
    getBookmarks(userId: string): Promise<{
        id: string;
        createdAt: Date;
        surahId: number;
        verseNumber: number;
        userId: string;
        note: string | null;
    }[]>;
}
