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
exports.DuasController = void 0;
const common_1 = require("@nestjs/common");
const duas_service_1 = require("../services/duas.service");
let DuasController = class DuasController {
    constructor(duasService) {
        this.duasService = duasService;
    }
    async getDuas(filters) {
        return this.duasService.getDuas(filters);
    }
    async getDua(id) {
        return this.duasService.getDua(id);
    }
    async getCategories() {
        return this.duasService.getCategories();
    }
    async searchDuas(query) {
        return this.duasService.searchDuas(query);
    }
    async createCustomDua(createDuaDto) {
        return this.duasService.createCustomDua(createDuaDto);
    }
    async addFavorite(favoriteDto) {
        return this.duasService.addFavorite(favoriteDto);
    }
    async getFavorites(userId) {
        return this.duasService.getFavorites(userId);
    }
    async getDailyDua() {
        return this.duasService.getDailyDua();
    }
};
exports.DuasController = DuasController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DuasController.prototype, "getDuas", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DuasController.prototype, "getDua", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DuasController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DuasController.prototype, "searchDuas", null);
__decorate([
    (0, common_1.Post)('custom'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DuasController.prototype, "createCustomDua", null);
__decorate([
    (0, common_1.Post)('favorites'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DuasController.prototype, "addFavorite", null);
__decorate([
    (0, common_1.Get)('favorites'),
    __param(0, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DuasController.prototype, "getFavorites", null);
__decorate([
    (0, common_1.Get)('daily'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DuasController.prototype, "getDailyDua", null);
exports.DuasController = DuasController = __decorate([
    (0, common_1.Controller)('api/v1/islam/duas'),
    __metadata("design:paramtypes", [duas_service_1.DuasService])
], DuasController);
//# sourceMappingURL=duas.controller.js.map