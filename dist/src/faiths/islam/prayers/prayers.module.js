"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrayersModule = void 0;
const common_1 = require("@nestjs/common");
const prayers_controller_1 = require("./controllers/prayers.controller");
const prayers_service_1 = require("./services/prayers.service");
const prayer_calculations_service_1 = require("./services/prayer-calculations.service");
const prisma_service_1 = require("../../../common/utils/prisma.service");
let PrayersModule = class PrayersModule {
};
exports.PrayersModule = PrayersModule;
exports.PrayersModule = PrayersModule = __decorate([
    (0, common_1.Module)({
        controllers: [prayers_controller_1.PrayersController],
        providers: [prayers_service_1.PrayersService, prayer_calculations_service_1.PrayerCalculationsService, prisma_service_1.PrismaService],
        exports: [prayers_service_1.PrayersService],
    })
], PrayersModule);
//# sourceMappingURL=prayers.module.js.map