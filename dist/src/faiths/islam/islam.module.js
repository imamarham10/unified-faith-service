"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IslamModule = void 0;
const common_1 = require("@nestjs/common");
const prayers_module_1 = require("./prayers/prayers.module");
const quran_module_1 = require("./quran/quran.module");
const dhikr_module_1 = require("./dhikr/dhikr.module");
const calendar_module_1 = require("./calendar/calendar.module");
const duas_module_1 = require("./duas/duas.module");
const names_module_1 = require("./names/names.module");
const qibla_module_1 = require("./qibla/qibla.module");
const feelings_module_1 = require("./feelings/feelings.module");
let IslamModule = class IslamModule {
};
exports.IslamModule = IslamModule;
exports.IslamModule = IslamModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prayers_module_1.PrayersModule,
            quran_module_1.QuranModule,
            dhikr_module_1.DhikrModule,
            calendar_module_1.CalendarModule,
            duas_module_1.DuasModule,
            names_module_1.NamesModule,
            qibla_module_1.QiblaModule,
            feelings_module_1.FeelingsModule,
        ],
        exports: [
            prayers_module_1.PrayersModule,
            quran_module_1.QuranModule,
            dhikr_module_1.DhikrModule,
            calendar_module_1.CalendarModule,
            duas_module_1.DuasModule,
            names_module_1.NamesModule,
            qibla_module_1.QiblaModule,
            feelings_module_1.FeelingsModule,
        ],
    })
], IslamModule);
//# sourceMappingURL=islam.module.js.map