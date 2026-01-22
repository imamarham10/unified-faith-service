"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const preferences_controller_1 = require("../controllers/preferences.controller");
const preferences_service_1 = require("../services/preferences.service");
const prisma_service_1 = require("../repositories/prisma.service");
let PreferencesModule = class PreferencesModule {
};
exports.PreferencesModule = PreferencesModule;
exports.PreferencesModule = PreferencesModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        controllers: [preferences_controller_1.PreferencesController],
        providers: [preferences_service_1.PreferencesService, prisma_service_1.PrismaService],
        exports: [preferences_service_1.PreferencesService],
    })
], PreferencesModule);
//# sourceMappingURL=preferences.module.js.map