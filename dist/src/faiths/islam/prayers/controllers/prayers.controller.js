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
exports.PrayersController = void 0;
const common_1 = require("@nestjs/common");
const prayers_service_1 = require("../services/prayers.service");
const prayers_dto_1 = require("../dto/prayers.dto");
const jwt_auth_guard_1 = require("../../../../auth-service/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../../auth-service/decorators/current-user.decorator");
const public_decorator_1 = require("../../../../auth-service/decorators/public.decorator");
let PrayersController = class PrayersController {
    constructor(prayersService) {
        this.prayersService = prayersService;
    }
    async getPrayerTimes(query) {
        return this.prayersService.getPrayerTimes(query.lat, query.lng, query.date, query.method);
    }
    async getCurrentPrayer(lat, lng, method) {
        if (!lat || !lng) {
            throw new common_1.BadRequestException('Latitude and longitude are required');
        }
        return this.prayersService.getCurrentPrayer(parseFloat(lat), parseFloat(lng), method);
    }
    async logPrayer(user, body) {
        return this.prayersService.logPrayer(user.userId, body);
    }
    async getPrayerLogs(user, fromDate, toDate) {
        return this.prayersService.getPrayerLogs(user.userId, fromDate, toDate);
    }
    async deletePrayerLog(user, id) {
        return this.prayersService.deletePrayerLog(user.userId, id);
    }
    async getPrayerStats(user) {
        return this.prayersService.getPrayerStats(user.userId);
    }
};
exports.PrayersController = PrayersController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('times'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [prayers_dto_1.GetPrayerTimesDto]),
    __metadata("design:returntype", Promise)
], PrayersController.prototype, "getPrayerTimes", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('current'),
    __param(0, (0, common_1.Query)('lat')),
    __param(1, (0, common_1.Query)('lng')),
    __param(2, (0, common_1.Query)('method')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PrayersController.prototype, "getCurrentPrayer", null);
__decorate([
    (0, common_1.Post)('log'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, prayers_dto_1.LogPrayerDto]),
    __metadata("design:returntype", Promise)
], PrayersController.prototype, "logPrayer", null);
__decorate([
    (0, common_1.Get)('logs'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('fromDate')),
    __param(2, (0, common_1.Query)('toDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PrayersController.prototype, "getPrayerLogs", null);
__decorate([
    (0, common_1.Delete)('log/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PrayersController.prototype, "deletePrayerLog", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PrayersController.prototype, "getPrayerStats", null);
exports.PrayersController = PrayersController = __decorate([
    (0, common_1.Controller)('api/v1/islam/prayers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [prayers_service_1.PrayersService])
], PrayersController);
//# sourceMappingURL=prayers.controller.js.map