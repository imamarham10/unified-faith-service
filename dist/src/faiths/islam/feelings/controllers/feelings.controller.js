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
exports.FeelingsController = void 0;
const common_1 = require("@nestjs/common");
const feelings_service_1 = require("../services/feelings.service");
const public_decorator_1 = require("../../../../auth-service/decorators/public.decorator");
let FeelingsController = class FeelingsController {
    constructor(feelingsService) {
        this.feelingsService = feelingsService;
    }
    async getAllEmotions() {
        return this.feelingsService.getAllEmotions();
    }
    async getEmotionBySlug(slug) {
        return this.feelingsService.getEmotionBySlug(slug);
    }
};
exports.FeelingsController = FeelingsController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FeelingsController.prototype, "getAllEmotions", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FeelingsController.prototype, "getEmotionBySlug", null);
exports.FeelingsController = FeelingsController = __decorate([
    (0, common_1.Controller)('api/v1/islam/feelings'),
    __metadata("design:paramtypes", [feelings_service_1.FeelingsService])
], FeelingsController);
//# sourceMappingURL=feelings.controller.js.map