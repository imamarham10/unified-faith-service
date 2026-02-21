import { DhikrPhrase } from '../constants/dhikr-phrases.constant';
export declare class DhikrDictionaryService {
    detectLanguage(text: string): 'arabic' | 'english';
    findByArabic(arabicText: string): DhikrPhrase | null;
    findByEnglish(englishText: string): DhikrPhrase | null;
    findByTransliteration(text: string): DhikrPhrase | null;
    resolvePhrase(inputPhrase: string): DhikrPhrase;
    getAllPhrases(): DhikrPhrase[];
}
