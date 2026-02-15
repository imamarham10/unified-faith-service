"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeelingsModule = void 0;
const common_1 = require("@nestjs/common");
const feelings_controller_1 = require("./controllers/feelings.controller");
const feelings_service_1 = require("./services/feelings.service");
const prisma_service_1 = require("../../../common/utils/prisma.service");
let FeelingsModule = class FeelingsModule {
};
exports.FeelingsModule = FeelingsModule;
exports.FeelingsModule = FeelingsModule = __decorate([
    (0, common_1.Module)({
        controllers: [feelings_controller_1.FeelingsController],
        providers: [feelings_service_1.FeelingsService, prisma_service_1.PrismaService],
    })
], FeelingsModule);
//# sourceMappingURL=feelings.module.js.map