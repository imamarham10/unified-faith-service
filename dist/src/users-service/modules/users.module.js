"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersModule = void 0;
const common_1 = require("@nestjs/common");
const profile_module_1 = require("./profile.module");
const preferences_module_1 = require("./preferences.module");
const auth_module_1 = require("../../auth-service/modules/auth.module");
const device_token_controller_1 = require("../controllers/device-token.controller");
const device_token_service_1 = require("../services/device-token.service");
const prisma_service_1 = require("../repositories/prisma.service");
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            profile_module_1.ProfileModule,
            preferences_module_1.PreferencesModule,
            auth_module_1.AuthModule,
        ],
        controllers: [device_token_controller_1.DeviceTokenController],
        providers: [device_token_service_1.DeviceTokenService, prisma_service_1.PrismaService],
        exports: [device_token_service_1.DeviceTokenService],
    })
], UsersModule);
//# sourceMappingURL=users.module.js.map