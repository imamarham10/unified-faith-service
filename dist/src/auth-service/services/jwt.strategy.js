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
var JwtStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const auth_service_1 = require("./auth.service");
let JwtStrategy = JwtStrategy_1 = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor(authService) {
        const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromExtractors([
                passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
                (req) => req?.cookies?.accessToken || null,
            ]),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
        this.authService = authService;
        this.logger = new common_1.Logger(JwtStrategy_1.name);
        this.logger.log('JWT Strategy initialized');
    }
    async validate(payload) {
        this.logger.debug(`JWT Strategy - Validating payload for user: ${payload.email} (${payload.sub})`);
        if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = payload.exp - now;
            this.logger.debug(`Token expires at: ${new Date(payload.exp * 1000).toISOString()}, Time until expiry: ${timeUntilExpiry}s`);
        }
        const user = await this.authService.validateJwtPayload(payload);
        if (!user) {
            this.logger.warn(`JWT Strategy - User validation failed for ${payload.email}`);
            throw new common_1.UnauthorizedException('User validation failed');
        }
        this.logger.debug(`JWT Strategy - User validated successfully: ${payload.email}`);
        return {
            userId: payload.sub,
            email: payload.email,
            roles: payload.roles,
            permissions: payload.permissions,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = JwtStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map