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
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../repositories/prisma.service");
const email_service_1 = require("../providers/email/email.service");
let OtpService = class OtpService {
    constructor(prisma, emailService, configService) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.configService = configService;
        this.otpExpiresIn = this.configService.get('OTP_EXPIRES_IN', 300);
        this.maxAttempts = this.configService.get('OTP_MAX_ATTEMPTS', 3);
        this.rateLimitRequests = this.configService.get('OTP_RATE_LIMIT_REQUESTS', 3);
        this.rateLimitWindow = this.configService.get('OTP_RATE_LIMIT_WINDOW', 900);
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async requestOtp(email) {
        await this.checkRateLimit(email);
        await this.prisma.otpCode.updateMany({
            where: {
                identifier: email,
                isUsed: false,
                expiresAt: {
                    gt: new Date(),
                },
            },
            data: {
                isUsed: true,
            },
        });
        const otp = this.generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + this.otpExpiresIn * 1000);
        await this.prisma.otpCode.create({
            data: {
                identifier: email,
                codeHash: otpHash,
                expiresAt,
                attempts: 0,
                isUsed: false,
            },
        });
        await this.emailService.sendOtpEmail(email, otp);
        return {
            message: 'OTP sent successfully',
            expiresIn: this.otpExpiresIn,
        };
    }
    async verifyOtp(email, otp) {
        const otpRecord = await this.prisma.otpCode.findFirst({
            where: {
                identifier: email,
                isUsed: false,
                expiresAt: {
                    gt: new Date(),
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (!otpRecord) {
            throw new common_1.BadRequestException('Invalid or expired OTP');
        }
        if (otpRecord.attempts >= this.maxAttempts) {
            await this.prisma.otpCode.update({
                where: { id: otpRecord.id },
                data: { isUsed: true },
            });
            throw new common_1.BadRequestException('OTP attempts exceeded. Please request a new OTP.');
        }
        const isValid = await bcrypt.compare(otp, otpRecord.codeHash);
        if (!isValid) {
            await this.prisma.otpCode.update({
                where: { id: otpRecord.id },
                data: {
                    attempts: {
                        increment: 1,
                    },
                },
            });
            throw new common_1.BadRequestException(`Invalid OTP. ${this.maxAttempts - otpRecord.attempts - 1} attempts remaining.`);
        }
        await this.prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { isUsed: true },
        });
        return true;
    }
    async checkRateLimit(email) {
        const windowStart = new Date(Date.now() - this.rateLimitWindow * 1000);
        const recentRequests = await this.prisma.otpCode.count({
            where: {
                identifier: email,
                createdAt: {
                    gte: windowStart,
                },
            },
        });
        if (recentRequests >= this.rateLimitRequests) {
            throw new common_1.HttpException(`Too many OTP requests. Please try again after ${this.rateLimitWindow / 60} minutes.`, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
    }
    async cleanupExpiredOtps() {
        await this.prisma.otpCode.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        config_1.ConfigService])
], OtpService);
//# sourceMappingURL=otp.service.js.map