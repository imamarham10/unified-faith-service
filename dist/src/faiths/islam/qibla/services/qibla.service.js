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
exports.QiblaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../common/utils/prisma.service");
const adhan_1 = require("adhan");
let QiblaService = class QiblaService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getQiblaDirection(lat, lng) {
        const kaabaLat = 21.4225;
        const kaabaLng = 39.8262;
        const coordinates = new adhan_1.Coordinates(lat, lng);
        const direction = (0, adhan_1.Qibla)(coordinates);
        const distance = this.calculateDistance(lat, lng, kaabaLat, kaabaLng);
        return {
            direction: direction,
            distance: Math.round(distance),
            unit: 'km',
            location: { lat, lng },
            kaaba: { lat: kaabaLat, lng: kaabaLng }
        };
    }
    async calculateQibla(calculateDto) {
        const { lat, lng } = calculateDto;
        return this.getQiblaDirection(lat, lng);
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        return d;
    }
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
};
exports.QiblaService = QiblaService;
exports.QiblaService = QiblaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QiblaService);
//# sourceMappingURL=qibla.service.js.map