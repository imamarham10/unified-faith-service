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
let CalendarController = class CalendarController {
    constructor(calendarService) {
        this.calendarService = calendarService;
    }
    async getHijriDate(date) {
        return this.calendarService.getHijriDate(date);
    }
    async convertDate(date, to) {
        return this.calendarService.convertDate(date, to);
    }
    async getEvents() {
        return this.calendarService.getEvents();
    }
    async getUpcomingEvents() {
        return this.calendarService.getUpcomingEvents();
    }
};
exports.CalendarController = CalendarController;
__decorate([
    (0, common_1.Get)('hijri'),
    __param(0, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getHijriDate", null);
__decorate([
    (0, common_1.Get)('convert'),
    __param(0, (0, common_1.Query)('date')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "convertDate", null);
__decorate([
    (0, common_1.Get)('events'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getEvents", null);
__decorate([
    (0, common_1.Get)('upcoming'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getUpcomingEvents", null);
exports.CalendarController = CalendarController = __decorate([
    (0, common_1.Controller)('api/v1/islam/calendar'),
    __metadata("design:paramtypes", [calendar_service_1.CalendarService])
], CalendarController);
//# sourceMappingURL=calendar.controller.js.map