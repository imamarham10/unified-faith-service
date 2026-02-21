"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DhikrDictionaryService = void 0;
const common_1 = require("@nestjs/common");
const dhikr_phrases_constant_1 = require("../constants/dhikr-phrases.constant");
let DhikrDictionaryService = class DhikrDictionaryService {
    detectLanguage(text) {
        const arabicRegex = /[\u0600-\u06FF]/;
        return arabicRegex.test(text) ? 'arabic' : 'english';
    }
    findByArabic(arabicText) {
        const normalized = (0, dhikr_phrases_constant_1.normalizeArabic)(arabicText);
        return dhikr_phrases_constant_1.DHIKR_BY_ARABIC.get(normalized) || null;
    }
    findByEnglish(englishText) {
        const normalized = (0, dhikr_phrases_constant_1.normalizeEnglish)(englishText);
        return dhikr_phrases_constant_1.DHIKR_BY_ENGLISH.get(normalized) || null;
    }
    findByTransliteration(text) {
        const normalized = (0, dhikr_phrases_constant_1.normalizeEnglish)(text);
        return dhikr_phrases_constant_1.DHIKR_BY_TRANSLITERATION.get(normalized) || null;
    }
    resolvePhrase(inputPhrase) {
        const language = this.detectLanguage(inputPhrase);
        let phrase;
        if (language === 'arabic') {
            phrase = this.findByArabic(inputPhrase);
            if (!phrase) {
                throw new common_1.BadRequestException(`Arabic phrase "${inputPhrase}" not found in dictionary. ` +
                    `Please provide a recognized dhikr phrase.`);
            }
        }
        else {
            phrase = this.findByEnglish(inputPhrase) ?? this.findByTransliteration(inputPhrase);
            if (!phrase) {
                throw new common_1.BadRequestException(`Phrase "${inputPhrase}" not found in dictionary. ` +
                    `Please provide a recognized dhikr phrase or transliteration (e.g. "SubhanAllah").`);
            }
        }
        return phrase;
    }
    getAllPhrases() {
        return dhikr_phrases_constant_1.COMMON_DHIKR_PHRASES;
    }
};
exports.DhikrDictionaryService = DhikrDictionaryService;
exports.DhikrDictionaryService = DhikrDictionaryService = __decorate([
    (0, common_1.Injectable)()
], DhikrDictionaryService);
//# sourceMappingURL=dhikr-dictionary.service.js.map