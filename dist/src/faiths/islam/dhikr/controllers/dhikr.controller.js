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
exports.DhikrController = void 0;
const common_1 = require("@nestjs/common");
const dhikr_service_1 = require("../services/dhikr.service");
const dhikr_dictionary_service_1 = require("../services/dhikr-dictionary.service");
const dhikr_dto_1 = require("../dto/dhikr.dto");
const jwt_auth_guard_1 = require("../../../../auth-service/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../../auth-service/decorators/current-user.decorator");
let DhikrController = class DhikrController {
    constructor(dhikrService, dictionaryService) {
        this.dhikrService = dhikrService;
        this.dictionaryService = dictionaryService;
    }
    async getCounters(user) {
        return this.dhikrService.getCounters(user.userId);
    }
    async createCounter(user, body) {
        return this.dhikrService.createCounter(user.userId, body);
    }
    async incrementCounter(id, body) {
        return this.dhikrService.incrementCounter(id, body.count || 1);
    }
    async deleteCounter(id) {
        return this.dhikrService.deleteCounter(id);
    }
    async createGoal(user, body) {
        return this.dhikrService.createGoal(user.userId, body);
    }
    async getGoals(user) {
        return this.dhikrService.getGoals(user.userId);
    }
    async getStats(user) {
        return this.dhikrService.getStats(user.userId);
    }
    async getHistory(user) {
        return this.dhikrService.getHistory(user.userId);
    }
    async getAvailablePhrases() {
        return this.dictionaryService.getAllPhrases();
    }
};
exports.DhikrController = DhikrController;
__decorate([
    (0, common_1.Get)('counters'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DhikrController.prototype, "getCounters", null);
__decorate([
    (0, common_1.Post)('counters'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dhikr_dto_1.CreateCounterDto]),
    __metadata("design:returntype", Promise)
], DhikrController.prototype, "createCounter", null);
__decorate([
    (0, common_1.Patch)('counters/:id'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dhikr_dto_1.UpdateCounterDto]),
    __metadata("design:returntype", Promise)
], DhikrController.prototype, "incrementCounter", null);
__decorate([
    (0, common_1.Delete)('counters/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DhikrController.prototype, "deleteCounter", null);
__decorate([
    (0, common_1.Post)('goals'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dhikr_dto_1.CreateGoalDto]),
    __metadata("design:returntype", Promise)
], DhikrController.prototype, "createGoal", null);
__decorate([
    (0, common_1.Get)('goals'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DhikrController.prototype, "getGoals", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DhikrController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DhikrController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('phrases'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DhikrController.prototype, "getAvailablePhrases", null);
exports.DhikrController = DhikrController = __decorate([
    (0, common_1.Controller)('api/v1/islam/dhikr'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [dhikr_service_1.DhikrService,
        dhikr_dictionary_service_1.DhikrDictionaryService])
], DhikrController);
//# sourceMappingURL=dhikr.controller.js.map