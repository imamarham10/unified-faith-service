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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetTodayDto = exports.GetUpcomingEventsDto = exports.GetHijriMonthDto = exports.GetGregorianMonthDto = exports.ConvertToGregorianDto = exports.ConvertToHijriDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class ConvertToHijriDto {
}
exports.ConvertToHijriDto = ConvertToHijriDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ConvertToHijriDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConvertToHijriDto.prototype, "timezone", void 0);
class ConvertToGregorianDto {
}
exports.ConvertToGregorianDto = ConvertToGregorianDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1343),
    (0, class_validator_1.Max)(1500),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ConvertToGregorianDto.prototype, "year", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ConvertToGregorianDto.prototype, "month", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(30),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ConvertToGregorianDto.prototype, "day", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConvertToGregorianDto.prototype, "timezone", void 0);
class GetGregorianMonthDto {
}
exports.GetGregorianMonthDto = GetGregorianMonthDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1900),
    (0, class_validator_1.Max)(2100),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], GetGregorianMonthDto.prototype, "year", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], GetGregorianMonthDto.prototype, "month", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetGregorianMonthDto.prototype, "timezone", void 0);
class GetHijriMonthDto {
}
exports.GetHijriMonthDto = GetHijriMonthDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1343),
    (0, class_validator_1.Max)(1500),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], GetHijriMonthDto.prototype, "year", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], GetHijriMonthDto.prototype, "month", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetHijriMonthDto.prototype, "timezone", void 0);
class GetUpcomingEventsDto {
    constructor() {
        this.days = 90;
    }
}
exports.GetUpcomingEventsDto = GetUpcomingEventsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(365),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], GetUpcomingEventsDto.prototype, "days", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetUpcomingEventsDto.prototype, "timezone", void 0);
class GetTodayDto {
}
exports.GetTodayDto = GetTodayDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetTodayDto.prototype, "timezone", void 0);
//# sourceMappingURL=calendar.dto.js.map