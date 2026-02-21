import { Injectable, BadRequestException } from '@nestjs/common';
import {
  DhikrPhrase,
  COMMON_DHIKR_PHRASES,
  DHIKR_BY_ARABIC,
  DHIKR_BY_ENGLISH,
  DHIKR_BY_TRANSLITERATION,
  normalizeArabic,
  normalizeEnglish,
} from '../constants/dhikr-phrases.constant';

@Injectable()
export class DhikrDictionaryService {
  /**
   * Detect if input text is Arabic or English
   * Arabic Unicode range: U+0600 to U+06FF
   */
  detectLanguage(text: string): 'arabic' | 'english' {
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text) ? 'arabic' : 'english';
  }

  /**
   * Find dhikr phrase by Arabic text
   */
  findByArabic(arabicText: string): DhikrPhrase | null {
    const normalized = normalizeArabic(arabicText);
    return DHIKR_BY_ARABIC.get(normalized) || null;
  }

  /**
   * Find dhikr phrase by English meaning
   */
  findByEnglish(englishText: string): DhikrPhrase | null {
    const normalized = normalizeEnglish(englishText);
    return DHIKR_BY_ENGLISH.get(normalized) || null;
  }

  /**
   * Find dhikr phrase by transliteration (e.g. "SubhanAllah", "La ilaha illallah")
   */
  findByTransliteration(text: string): DhikrPhrase | null {
    const normalized = normalizeEnglish(text);
    return DHIKR_BY_TRANSLITERATION.get(normalized) || null;
  }

  /**
   * Resolve phrase to complete bilingual data.
   * Accepts Arabic text, English meaning, or transliteration.
   */
  resolvePhrase(inputPhrase: string): DhikrPhrase {
    const language = this.detectLanguage(inputPhrase);

    let phrase: DhikrPhrase | null;

    if (language === 'arabic') {
      phrase = this.findByArabic(inputPhrase);
      if (!phrase) {
        throw new BadRequestException(
          `Arabic phrase "${inputPhrase}" not found in dictionary. ` +
            `Please provide a recognized dhikr phrase.`
        );
      }
    } else {
      // Try English meaning first, then transliteration as fallback
      phrase = this.findByEnglish(inputPhrase) ?? this.findByTransliteration(inputPhrase);
      if (!phrase) {
        throw new BadRequestException(
          `Phrase "${inputPhrase}" not found in dictionary. ` +
            `Please provide a recognized dhikr phrase or transliteration (e.g. "SubhanAllah").`
        );
      }
    }

    return phrase;
  }

  /**
   * Get all available dhikr phrases
   */
  getAllPhrases(): DhikrPhrase[] {
    return COMMON_DHIKR_PHRASES;
  }
}
