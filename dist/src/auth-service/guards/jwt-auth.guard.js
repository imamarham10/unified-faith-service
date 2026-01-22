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
var JwtAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const passport_1 = require("@nestjs/passport");
const public_decorator_1 = require("../decorators/public.decorator");
let JwtAuthGuard = JwtAuthGuard_1 = class JwtAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    constructor(reflector) {
        super();
        this.reflector = reflector;
        this.logger = new common_1.Logger(JwtAuthGuard_1.name);
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers?.authorization;
        this.logger.debug(`JWT Guard - Checking authentication for ${request.method} ${request.url}`);
        this.logger.debug(`Authorization header: ${authHeader ? 'Present' : 'Missing'}`);
        return super.canActivate(context);
    }
    handleRequest(err, user, info, context) {
        const request = context.switchToHttp().getRequest();
        if (err) {
            this.logger.error(`JWT Guard Error: ${err.message}`, err.stack);
            throw new common_1.UnauthorizedException(`Authentication failed: ${err.message}`);
        }
        if (info) {
            this.logger.warn(`JWT Guard Info: ${JSON.stringify(info)}`);
            if (info.name === 'TokenExpiredError') {
                throw new common_1.UnauthorizedException('Token has expired. Please login again.');
            }
            if (info.name === 'JsonWebTokenError') {
                if (info.message === 'invalid signature') {
                    this.logger.error('JWT Secret Mismatch! Token was signed with a different secret. ' +
                        'Please login again to get a new token signed with the current secret.');
                    throw new common_1.UnauthorizedException('Invalid token signature. This usually means the JWT_SECRET changed. Please login again.');
                }
                throw new common_1.UnauthorizedException(`Invalid token: ${info.message}`);
            }
            if (info.name === 'NotBeforeError') {
                throw new common_1.UnauthorizedException('Token not active yet');
            }
        }
        if (!user) {
            this.logger.warn(`JWT Guard - No user found for ${request.method} ${request.url}`);
            throw new common_1.UnauthorizedException('Invalid or missing token');
        }
        this.logger.debug(`JWT Guard - User authenticated: ${user.email} (${user.userId})`);
        return user;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = JwtAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map