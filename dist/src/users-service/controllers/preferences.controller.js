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
exports.PreferencesController = void 0;
const common_1 = require("@nestjs/common");
const preferences_service_1 = require("../services/preferences.service");
const update_preferences_dto_1 = require("../dto/update-preferences.dto");
const jwt_auth_guard_1 = require("../../auth-service/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth-service/guards/roles.guard");
const roles_decorator_1 = require("../../auth-service/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth-service/decorators/current-user.decorator");
let PreferencesController = class PreferencesController {
    constructor(preferencesService) {
        this.preferencesService = preferencesService;
    }
    async getPreferences(user) {
        return this.preferencesService.getPreferences(user.userId);
    }
    async updatePreferences(user, updatePreferencesDto) {
        return this.preferencesService.updatePreferences(user.userId, updatePreferencesDto);
    }
    async getPreferencesByUserId(userId) {
        try {
            return await this.preferencesService.getPreferencesByUserId(userId);
        }
        catch (error) {
            throw new common_1.NotFoundException(`Preferences for user ${userId} not found`);
        }
    }
};
exports.PreferencesController = PreferencesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_preferences_dto_1.UpdatePreferencesDto]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "updatePreferences", null);
__decorate([
    (0, common_1.Get)(':userId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "getPreferencesByUserId", null);
exports.PreferencesController = PreferencesController = __decorate([
    (0, common_1.Controller)('users/preferences'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [preferences_service_1.PreferencesService])
], PreferencesController);
//# sourceMappingURL=preferences.controller.js.map