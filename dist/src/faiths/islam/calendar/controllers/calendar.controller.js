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
exports.CalendarController = void 0;
const common_1 = require("@nestjs/common");
const calendar_service_1 = require("../services/calendar.service");
const calendar_dto_1 = require("../dto/calendar.dto");
const jwt_auth_guard_1 = require("../../../../auth-service/guards/jwt-auth.guard");
const public_decorator_1 = require("../../../../auth-service/decorators/public.decorator");
let CalendarController = class CalendarController {
    constructor(calendarService) {
        this.calendarService = calendarService;
    }
    async getToday(query) {
        return this.calendarService.getToday(query.timezone);
    }
    async convertToHijri(query) {
        const date = query.date ? new Date(query.date) : new Date();
        return this.calendarService.gregorianToHijri(date, query.timezone);
    }
    async convertToGregorian(query) {
        return this.calendarService.hijriToGregorian(query.year, query.month, query.day, query.timezone);
    }
    async getGregorianMonth(query) {
        return this.calendarService.getGregorianMonthCalendar(query.year, query.month, query.timezone);
    }
    async getHijriMonth(query) {
        return this.calendarService.getHijriMonthCalendar(query.year, query.month, query.timezone);
    }
    async getAllEvents() {
        return this.calendarService.getAllEvents();
    }
    async getUpcomingEvents(query) {
        return this.calendarService.getUpcomingEvents(query.days, query.timezone);
    }
    async getHijriMonths() {
        return this.calendarService.getHijriMonthNames();
    }
};
exports.CalendarController = CalendarController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('today'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calendar_dto_1.GetTodayDto]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getToday", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('convert/to-hijri'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calendar_dto_1.ConvertToHijriDto]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "convertToHijri", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('convert/to-gregorian'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calendar_dto_1.ConvertToGregorianDto]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "convertToGregorian", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('gregorian-month'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calendar_dto_1.GetGregorianMonthDto]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getGregorianMonth", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('hijri-month'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calendar_dto_1.GetHijriMonthDto]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getHijriMonth", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('events'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getAllEvents", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('events/upcoming'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calendar_dto_1.GetUpcomingEventsDto]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getUpcomingEvents", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('months'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getHijriMonths", null);
exports.CalendarController = CalendarController = __decorate([
    (0, common_1.Controller)('api/v1/islam/calendar'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [calendar_service_1.CalendarService])
], CalendarController);
//# sourceMappingURL=calendar.controller.js.map