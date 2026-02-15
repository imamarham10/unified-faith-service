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
exports.FeelingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../common/utils/prisma.service");
let FeelingsService = class FeelingsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAllEmotions() {
        const emotions = await this.prisma.emotion.findMany({
            orderBy: {
                name: 'asc',
            },
            select: {
                id: true,
                name: true,
                slug: true,
                icon: true,
            },
        });
        return emotions;
    }
    async getEmotionBySlug(slug) {
        const emotion = await this.prisma.emotion.findUnique({
            where: { slug },
            include: {
                remedies: {
                    select: {
                        id: true,
                        arabicText: true,
                        transliteration: true,
                        translation: true,
                        source: true,
                    },
                },
            },
        });
        if (!emotion) {
            throw new common_1.NotFoundException(`Emotion with slug '${slug}' not found`);
        }
        return emotion;
    }
};
exports.FeelingsService = FeelingsService;
exports.FeelingsService = FeelingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FeelingsService);
//# sourceMappingURL=feelings.service.js.map