"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuranService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const common_2 = require("@nestjs/common");
const prisma_service_1 = require("../../../../common/utils/prisma.service");
const CACHE_TTL = {
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
};
let QuranService = class QuranService {
    constructor(prisma, cacheManager) {
        this.prisma = prisma;
        this.cacheManager = cacheManager;
    }
    async getAllSurahs() {
        const cacheKey = 'quran:surahs';
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const result = await this.prisma.quranSurah.findMany({
            orderBy: { id: 'asc' },
        });
        await this.cacheManager.set(cacheKey, result, CACHE_TTL.WEEK);
        return result;
    }
    async getSurah(surahId, language = 'en') {
        const surah = await this.prisma.quranSurah.findUnique({
            where: { id: surahId },
            include: {
                verses: {
                    orderBy: { verseNumber: 'asc' },
                    include: {
                        translations: {
                            where: { language },
                        },
                    },
                },
            },
        });
        if (!surah) {
            throw new common_1.NotFoundException(`Surah with ID ${surahId} not found`);
        }
        return surah;
    }
    async getVerse(verseKey, language = 'en') {
        let verse = await this.prisma.quranVerse.findUnique({
            where: { id: verseKey },
            include: {
                surah: true,
                translations: { where: { language } },
            },
        });
        if (!verse && verseKey.includes(':')) {
            const [surahId, verseNum] = verseKey.split(':').map(Number);
            if (!isNaN(surahId) && !isNaN(verseNum)) {
                verse = await this.prisma.quranVerse.findUnique({
                    where: { surahId_verseNumber: { surahId, verseNumber: verseNum } },
                    include: {
                        surah: true,
                        translations: { where: { language } },
                    }
                });
            }
        }
        if (!verse) {
            throw new common_1.NotFoundException(`Verse ${verseKey} not found`);
        }
        return verse;
    }
    async searchVerses(query, language = 'en') {
        if (!query || query.length < 3) {
            return [];
        }
        return this.prisma.quranVerse.findMany({
            where: {
                OR: [
                    { textSimple: { contains: query, mode: 'insensitive' } },
                    {
                        translations: {
                            some: {
                                text: { contains: query, mode: 'insensitive' },
                                language
                            }
                        }
                    }
                ]
            },
            include: {
                surah: true,
                translations: { where: { language } },
            },
            take: 50,
        });
    }
    async addBookmark(userId, data) {
        const verse = await this.prisma.quranVerse.findUnique({
            where: { surahId_verseNumber: { surahId: data.surahId, verseNumber: data.verseNumber } }
        });
        if (!verse) {
            throw new common_1.NotFoundException('Verse not found');
        }
        return this.prisma.userQuranBookmark.create({
            data: {
                userId,
                surahId: data.surahId,
                verseNumber: data.verseNumber,
                note: data.note,
            },
        });
    }
    async getBookmarks(userId) {
        return this.prisma.userQuranBookmark.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async deleteBookmark(userId, bookmarkId) {
        const bookmark = await this.prisma.userQuranBookmark.findFirst({
            where: { id: bookmarkId, userId },
        });
        if (!bookmark) {
            throw new common_1.NotFoundException('Bookmark not found');
        }
        return this.prisma.userQuranBookmark.delete({
            where: { id: bookmarkId },
        });
    }
};
exports.QuranService = QuranService;
exports.QuranService = QuranService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_2.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], QuranService);
//# sourceMappingURL=quran.service.js.map