import { Injectable, BadRequestException } from '@nestjs/common';
import {
  DhikrPhrase,
  COMMON_DHIKR_PHRASES,
  DHIKR_BY_ARABIC,
  DHIKR_BY_ENGLISH,
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
   * Find dhikr phrase by English text
   */
  findByEnglish(englishText: string): DhikrPhrase | null {
    const normalized = normalizeEnglish(englishText);
    return DHIKR_BY_ENGLISH.get(normalized) || null;
  }

  /**
   * Resolve phrase to complete bilingual data
   * Detects language and looks up phrase in appropriate map
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
      phrase = this.findByEnglish(inputPhrase);
      if (!phrase) {
        throw new BadRequestException(
          `English phrase "${inputPhrase}" not found in dictionary. ` +
            `Please provide a recognized dhikr phrase.`
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
