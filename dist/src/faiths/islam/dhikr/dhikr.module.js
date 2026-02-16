"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DhikrModule = void 0;
const common_1 = require("@nestjs/common");
const dhikr_controller_1 = require("./controllers/dhikr.controller");
const dhikr_service_1 = require("./services/dhikr.service");
const dhikr_dictionary_service_1 = require("./services/dhikr-dictionary.service");
const prisma_service_1 = require("../../../common/utils/prisma.service");
let DhikrModule = class DhikrModule {
};
exports.DhikrModule = DhikrModule;
exports.DhikrModule = DhikrModule = __decorate([
    (0, common_1.Module)({
        controllers: [dhikr_controller_1.DhikrController],
        providers: [dhikr_service_1.DhikrService, dhikr_dictionary_service_1.DhikrDictionaryService, prisma_service_1.PrismaService],
        exports: [dhikr_service_1.DhikrService, dhikr_dictionary_service_1.DhikrDictionaryService],
    })
], DhikrModule);
//# sourceMappingURL=dhikr.module.js.map