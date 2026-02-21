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
exports.QuranController = void 0;
const common_1 = require("@nestjs/common");
const quran_service_1 = require("../services/quran.service");
const quran_dto_1 = require("../dto/quran.dto");
const jwt_auth_guard_1 = require("../../../../auth-service/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../../auth-service/decorators/current-user.decorator");
const public_decorator_1 = require("../../../../auth-service/decorators/public.decorator");
let QuranController = class QuranController {
    constructor(quranService) {
        this.quranService = quranService;
    }
    async getAllSurahs() {
        return this.quranService.getAllSurahs();
    }
    async getSurah(id, lang = 'en') {
        const surahId = parseInt(id);
        if (isNaN(surahId)) {
            throw new common_1.BadRequestException('Invalid Surah ID');
        }
        return this.quranService.getSurah(surahId, lang);
    }
    async getVerse(id, lang = 'en') {
        return this.quranService.getVerse(id, lang);
    }
    async searchVerses(query, lang = 'en') {
        if (!query) {
            throw new common_1.BadRequestException('Search query is required');
        }
        return this.quranService.searchVerses(query, lang);
    }
    async addBookmark(user, body) {
        return this.quranService.addBookmark(user.userId, body);
    }
    async getBookmarks(user) {
        return this.quranService.getBookmarks(user.userId);
    }
    async deleteBookmark(user, id) {
        return this.quranService.deleteBookmark(user.userId, id);
    }
};
exports.QuranController = QuranController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('surahs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QuranController.prototype, "getAllSurahs", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('surah/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('lang')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], QuranController.prototype, "getSurah", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('verse/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('lang')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], QuranController.prototype, "getVerse", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('lang')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], QuranController.prototype, "searchVerses", null);
__decorate([
    (0, common_1.Post)('bookmarks'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, quran_dto_1.AddBookmarkDto]),
    __metadata("design:returntype", Promise)
], QuranController.prototype, "addBookmark", null);
__decorate([
    (0, common_1.Get)('bookmarks'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QuranController.prototype, "getBookmarks", null);
__decorate([
    (0, common_1.Delete)('bookmarks/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], QuranController.prototype, "deleteBookmark", null);
exports.QuranController = QuranController = __decorate([
    (0, common_1.Controller)('api/v1/islam/quran'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [quran_service_1.QuranService])
], QuranController);
//# sourceMappingURL=quran.controller.js.map