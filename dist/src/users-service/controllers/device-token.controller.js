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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DeviceTokenController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceTokenController = void 0;
const common_1 = require("@nestjs/common");
const device_token_service_1 = require("../services/device-token.service");
const register_device_token_dto_1 = require("../dto/register-device-token.dto");
const jwt_auth_guard_1 = require("../../auth-service/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth-service/decorators/current-user.decorator");
let DeviceTokenController = DeviceTokenController_1 = class DeviceTokenController {
    constructor(deviceTokenService) {
        this.deviceTokenService = deviceTokenService;
        this.logger = new common_1.Logger(DeviceTokenController_1.name);
    }
    async registerDeviceToken(user, registerDto, req, userAgentHeader) {
        this.logger.log(`[DeviceToken] ====== ENDPOINT CALLED ======`);
        this.logger.log(`[DeviceToken] Registration request received for user: ${user.userId}`);
        try {
            const userAgent = userAgentHeader || req.get?.('user-agent') || req.headers?.['user-agent'] || '';
            this.logger.log(`[DeviceToken] User-Agent: ${userAgent || '(empty)'}`);
            this.logger.log(`[DeviceToken] Request body - platform: ${registerDto.platform || '(not provided)'}, deviceName: ${registerDto.deviceName || '(not provided)'}, token: [REDACTED]`);
            let platform = registerDto.platform;
            if (!platform) {
                const ua = userAgent.toLowerCase();
                this.logger.log(`[DeviceToken] Auto-detecting platform from User-Agent: ${ua}`);
                if (ua.includes('android')) {
                    platform = 'android';
                    this.logger.log('[DeviceToken] ✅ Detected platform: android');
                }
                else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
                    platform = 'ios';
                    this.logger.log('[DeviceToken] ✅ Detected platform: ios');
                }
                else {
                    platform = 'web';
                    this.logger.log('[DeviceToken] ✅ Detected platform: web (default)');
                }
            }
            else {
                this.logger.log(`[DeviceToken] Using provided platform: ${platform}`);
            }
            let deviceName = registerDto.deviceName;
            if (!deviceName && userAgent) {
                const ua = userAgent;
                let detectedName;
                if (ua.includes('iPhone')) {
                    const match = ua.match(/iPhone[^)]*/);
                    detectedName = match ? match[0] : 'iPhone';
                }
                else if (ua.includes('iPad')) {
                    const match = ua.match(/iPad[^)]*/);
                    detectedName = match ? match[0] : 'iPad';
                }
                else if (ua.includes('Android')) {
                    const match = ua.match(/Android[^;)]*/);
                    detectedName = match ? match[0] : 'Android Device';
                }
                else if (ua.includes('Windows')) {
                    detectedName = 'Windows Device';
                }
                else if (ua.includes('Mac')) {
                    detectedName = 'Mac Device';
                }
                else if (ua.includes('Linux')) {
                    detectedName = 'Linux Device';
                }
                else if (ua.includes('Postman')) {
                    detectedName = 'Postman';
                }
                else {
                    detectedName = 'Unknown Device';
                }
                deviceName = detectedName;
                this.logger.log(`[DeviceToken] ✅ Auto-detected device name: ${deviceName}`);
            }
            else if (deviceName) {
                this.logger.log(`[DeviceToken] Using provided device name: ${deviceName}`);
            }
            else {
                this.logger.log('[DeviceToken] No device name provided and User-Agent is empty');
            }
            const enrichedDto = {
                ...registerDto,
                platform,
                deviceName: deviceName || registerDto.deviceName,
            };
            this.logger.log(`[DeviceToken] Final DTO - platform: ${enrichedDto.platform}, deviceName: ${enrichedDto.deviceName || '(none)'}`);
            const result = await this.deviceTokenService.registerDeviceToken(user.userId, enrichedDto);
            this.logger.log(`[DeviceToken] ✅ Device token registered successfully - ID: ${result.id}`);
            return result;
        }
        catch (error) {
            this.logger.error(`[DeviceToken] ❌ Error registering device token: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getDeviceTokens(user) {
        return this.deviceTokenService.getUserDeviceTokens(user.userId);
    }
    async removeDeviceToken(user, tokenId) {
        try {
            await this.deviceTokenService.removeDeviceToken(user.userId, tokenId);
            return { message: 'Device token removed successfully' };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.NotFoundException(`Device token with ID ${tokenId} not found`);
        }
    }
    async removeAllDeviceTokens(user) {
        await this.deviceTokenService.removeAllDeviceTokens(user.userId);
        return { message: 'All device tokens removed successfully' };
    }
};
exports.DeviceTokenController = DeviceTokenController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, register_device_token_dto_1.RegisterDeviceTokenDto, Object, String]),
    __metadata("design:returntype", Promise)
], DeviceTokenController.prototype, "registerDeviceToken", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeviceTokenController.prototype, "getDeviceTokens", null);
__decorate([
    (0, common_1.Delete)(':tokenId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('tokenId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DeviceTokenController.prototype, "removeDeviceToken", null);
__decorate([
    (0, common_1.Delete)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeviceTokenController.prototype, "removeAllDeviceTokens", null);
exports.DeviceTokenController = DeviceTokenController = DeviceTokenController_1 = __decorate([
    (0, common_1.Controller)('users/device-tokens'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [device_token_service_1.DeviceTokenService])
], DeviceTokenController);
//# sourceMappingURL=device-token.controller.js.map