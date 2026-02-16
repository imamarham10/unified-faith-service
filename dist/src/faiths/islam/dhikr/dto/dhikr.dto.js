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
exports.DhikrHistoryResponseDto = exports.DhikrGoalResponseDto = exports.DhikrCounterResponseDto = exports.CreateGoalDto = exports.UpdateCounterDto = exports.CreateCounterDto = void 0;
const class_validator_1 = require("class-validator");
class CreateCounterDto {
}
exports.CreateCounterDto = CreateCounterDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCounterDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCounterDto.prototype, "phrase", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateCounterDto.prototype, "targetCount", void 0);
class UpdateCounterDto {
}
exports.UpdateCounterDto = UpdateCounterDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateCounterDto.prototype, "count", void 0);
class CreateGoalDto {
}
exports.CreateGoalDto = CreateGoalDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGoalDto.prototype, "phrase", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateGoalDto.prototype, "targetCount", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(['daily', 'weekly', 'monthly']),
    __metadata("design:type", String)
], CreateGoalDto.prototype, "period", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateGoalDto.prototype, "endDate", void 0);
class DhikrCounterResponseDto {
}
exports.DhikrCounterResponseDto = DhikrCounterResponseDto;
class DhikrGoalResponseDto {
}
exports.DhikrGoalResponseDto = DhikrGoalResponseDto;
class DhikrHistoryResponseDto {
}
exports.DhikrHistoryResponseDto = DhikrHistoryResponseDto;
//# sourceMappingURL=dhikr.dto.js.map