import { QuranService } from '../services/quran.service';
import { AddBookmarkDto } from '../dto/quran.dto';
import { CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
export declare class QuranController {
    private readonly quranService;
    constructor(quranService: QuranService);
    getAllSurahs(): Promise<{
        id: number;
        nameArabic: string;
        nameEnglish: string;
        nameTransliteration: string;
        revelationPlace: string;
        verseCount: number;
    }[]>;
    getSurah(id: string, lang?: string): Promise<{
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
    addBookmark(user: CurrentUserData, body: AddBookmarkDto): Promise<{
        id: string;
        createdAt: Date;
        surahId: number;
        verseNumber: number;
        userId: string;
        note: string | null;
    }>;
    getBookmarks(user: CurrentUserData): Promise<{
        id: string;
        createdAt: Date;
        surahId: number;
        verseNumber: number;
        userId: string;
        note: string | null;
    }[]>;
}
