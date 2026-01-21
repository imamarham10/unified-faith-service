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
var SesProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SesProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let SesProvider = SesProvider_1 = class SesProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SesProvider_1.name);
    }
    async sendEmail(options) {
        try {
            throw new Error('SES provider not implemented. Install @aws-sdk/client-ses and implement.');
        }
        catch (error) {
            this.logger.error(`Failed to send email via SES to ${options.to}:`, error);
            throw new Error(`Failed to send email via SES: ${error.message}`);
        }
    }
};
exports.SesProvider = SesProvider;
exports.SesProvider = SesProvider = SesProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SesProvider);
//# sourceMappingURL=ses.provider.js.map