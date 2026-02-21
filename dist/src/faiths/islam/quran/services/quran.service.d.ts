import { Cache } from 'cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';
export declare class QuranService {
    private prisma;
    private cacheManager;
    constructor(prisma: PrismaService, cacheManager: Cache);
    getAllSurahs(): Promise<any[]>;
    getSurah(surahId: number, language?: string): Promise<{
        verses: ({
            translations: {
                id: string;
                language: string;
                verseId: string;
                authorName: string;
                text: string;
            }[];
        } & {
            id: string;
            surahId: number;
            verseNumber: number;
            textArabic: string;
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
            language: string;
            verseId: string;
            authorName: string;
            text: string;
        }[];
    } & {
        id: string;
        surahId: number;
        verseNumber: number;
        textArabic: string;
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
            language: string;
            verseId: string;
            authorName: string;
            text: string;
        }[];
    } & {
        id: string;
        surahId: number;
        verseNumber: number;
        textArabic: string;
        textSimple: string;
    })[]>;
    addBookmark(userId: string, data: {
        surahId: number;
        verseNumber: number;
        note?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        surahId: number;
        verseNumber: number;
        note: string | null;
    }>;
    getBookmarks(userId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        surahId: number;
        verseNumber: number;
        note: string | null;
    }[]>;
    deleteBookmark(userId: string, bookmarkId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        surahId: number;
        verseNumber: number;
        note: string | null;
    }>;
}
