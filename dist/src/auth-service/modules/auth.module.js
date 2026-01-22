"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const auth_controller_1 = require("../controllers/auth.controller");
const roles_controller_1 = require("../controllers/roles.controller");
const permissions_controller_1 = require("../controllers/permissions.controller");
const auth_service_1 = require("../services/auth.service");
const roles_service_1 = require("../services/roles.service");
const permissions_service_1 = require("../services/permissions.service");
const otp_service_1 = require("../services/otp.service");
const token_service_1 = require("../services/token.service");
const jwt_strategy_1 = require("../services/jwt.strategy");
const jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
const roles_guard_1 = require("../guards/roles.guard");
const permissions_guard_1 = require("../guards/permissions.guard");
const prisma_service_1 = require("../repositories/prisma.service");
const email_service_1 = require("../providers/email/email.service");
const smtp_provider_1 = require("../providers/email/smtp.provider");
const ses_provider_1 = require("../providers/email/ses.provider");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => {
                    const jwtSecret = configService.get('JWT_SECRET') || 'your-secret-key-change-in-production';
                    console.log('[AuthModule] JwtModule.registerAsync() - JWT_SECRET configured');
                    return {
                        secret: jwtSecret,
                        signOptions: {
                            expiresIn: '3600s',
                        },
                    };
                },
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [auth_controller_1.AuthController, roles_controller_1.RolesController, permissions_controller_1.PermissionsController],
        providers: [
            auth_service_1.AuthService,
            otp_service_1.OtpService,
            token_service_1.TokenService,
            roles_service_1.RolesService,
            permissions_service_1.PermissionsService,
            prisma_service_1.PrismaService,
            smtp_provider_1.SmtpProvider,
            ses_provider_1.SesProvider,
            email_service_1.EmailService,
            jwt_strategy_1.JwtStrategy,
            jwt_auth_guard_1.JwtAuthGuard,
            roles_guard_1.RolesGuard,
            permissions_guard_1.PermissionsGuard,
        ],
        exports: [
            auth_service_1.AuthService,
            roles_service_1.RolesService,
            permissions_service_1.PermissionsService,
            otp_service_1.OtpService,
            token_service_1.TokenService,
            jwt_auth_guard_1.JwtAuthGuard,
            roles_guard_1.RolesGuard,
            permissions_guard_1.PermissionsGuard,
            prisma_service_1.PrismaService,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map