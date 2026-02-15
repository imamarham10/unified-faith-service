"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrayerCalculationsService = void 0;
const common_1 = require("@nestjs/common");
const adhan_1 = require("adhan");
let PrayerCalculationsService = class PrayerCalculationsService {
    calculatePrayerTimes(lat, lng, date, methodSlug = 'mwl', madhab = 'shafi') {
        const coordinates = new adhan_1.Coordinates(lat, lng);
        const params = this.getCalculationMethod(methodSlug);
        if (madhab === 'hanafi') {
            params.madhab = adhan_1.Madhab.Hanafi;
        }
        else {
            params.madhab = adhan_1.Madhab.Shafi;
        }
        params.highLatitudeRule = adhan_1.HighLatitudeRule.MiddleOfTheNight;
        const prayerTimes = new adhan_1.PrayerTimes(coordinates, date, params);
        return {
            fajr: prayerTimes.fajr,
            sunrise: prayerTimes.sunrise,
            dhuhr: prayerTimes.dhuhr,
            asr: prayerTimes.asr,
            maghrib: prayerTimes.maghrib,
            isha: prayerTimes.isha,
        };
    }
    getCurrentPrayer(lat, lng, date = new Date(), methodSlug = 'mwl') {
        const coordinates = new adhan_1.Coordinates(lat, lng);
        const params = this.getCalculationMethod(methodSlug);
        const prayerTimes = new adhan_1.PrayerTimes(coordinates, date, params);
        const current = prayerTimes.currentPrayer();
        const next = prayerTimes.nextPrayer();
        return {
            current,
            next,
            times: {
                fajr: prayerTimes.fajr,
                sunrise: prayerTimes.sunrise,
                dhuhr: prayerTimes.dhuhr,
                asr: prayerTimes.asr,
                maghrib: prayerTimes.maghrib,
                isha: prayerTimes.isha,
            }
        };
    }
    getQiblaDirection(lat, lng) {
        const coordinates = new adhan_1.Coordinates(lat, lng);
        return (0, adhan_1.Qibla)(coordinates);
    }
    getCalculationMethod(slug) {
        switch (slug?.toLowerCase()) {
            case 'mwl': return adhan_1.CalculationMethod.MuslimWorldLeague();
            case 'isna': return adhan_1.CalculationMethod.NorthAmerica();
            case 'egypt': return adhan_1.CalculationMethod.Egyptian();
            case 'makkah': return adhan_1.CalculationMethod.UmmAlQura();
            case 'karachi': return adhan_1.CalculationMethod.Karachi();
            case 'kuwait': return adhan_1.CalculationMethod.Kuwait();
            case 'qatar': return adhan_1.CalculationMethod.Qatar();
            case 'singapore': return adhan_1.CalculationMethod.Singapore();
            case 'tehran': return adhan_1.CalculationMethod.Tehran();
            case 'turkey': return adhan_1.CalculationMethod.Turkey();
            default: return adhan_1.CalculationMethod.MuslimWorldLeague();
        }
    }
};
exports.PrayerCalculationsService = PrayerCalculationsService;
exports.PrayerCalculationsService = PrayerCalculationsService = __decorate([
    (0, common_1.Injectable)()
], PrayerCalculationsService);
//# sourceMappingURL=prayer-calculations.service.js.map