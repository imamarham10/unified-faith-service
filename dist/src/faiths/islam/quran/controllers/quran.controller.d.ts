import { QuranService } from '../services/quran.service';
import { AddBookmarkDto } from '../dto/quran.dto';
import { CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
export declare class QuranController {
    private readonly quranService;
    constructor(quranService: QuranService);
    getAllSurahs(): Promise<any[]>;
    getSurah(id: string, lang?: string): Promise<{
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
    getVerse(id: string, lang?: string): Promise<{
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
    searchVerses(query: string, lang?: string): Promise<({
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
    addBookmark(user: CurrentUserData, body: AddBookmarkDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        surahId: number;
        verseNumber: number;
        note: string | null;
    }>;
    getBookmarks(user: CurrentUserData): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        surahId: number;
        verseNumber: number;
        note: string | null;
    }[]>;
    deleteBookmark(user: CurrentUserData, id: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        surahId: number;
        verseNumber: number;
        note: string | null;
    }>;
}
