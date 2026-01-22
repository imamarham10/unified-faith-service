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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../repositories/prisma.service");
const otp_service_1 = require("./otp.service");
const token_service_1 = require("./token.service");
const roles_service_1 = require("./roles.service");
let AuthService = class AuthService {
    constructor(prisma, otpService, tokenService, rolesService, configService) {
        this.prisma = prisma;
        this.otpService = otpService;
        this.tokenService = tokenService;
        this.rolesService = rolesService;
        this.configService = configService;
    }
    async register(registerDto) {
        const existingUserByEmail = await this.prisma.user.findUnique({
            where: { email: registerDto.email },
        });
        if (existingUserByEmail) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        if (registerDto.phone) {
            const existingUserByPhone = await this.prisma.user.findFirst({
                where: { phone: registerDto.phone },
            });
            if (existingUserByPhone) {
                throw new common_1.ConflictException('User with this phone number already exists');
            }
        }
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);
        const user = await this.prisma.user.create({
            data: {
                email: registerDto.email,
                passwordHash,
                firstName: registerDto.firstName,
                lastName: registerDto.lastName,
                phone: registerDto.phone,
                isActive: true,
                isVerified: false,
            },
        });
        const userRole = await this.prisma.role.findUnique({
            where: { name: 'user' },
        });
        if (userRole) {
            await this.prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId: userRole.id,
                    assignedBy: null,
                },
            });
        }
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
        };
    }
    async login(loginDto, deviceInfo) {
        const user = await this.prisma.user.findUnique({
            where: { email: loginDto.email },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account is inactive');
        }
        if (!user.passwordHash) {
            throw new common_1.UnauthorizedException('Password not set. Please use OTP login.');
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const userRoles = await this.prisma.userRole.findMany({
            where: { userId: user.id },
            include: { role: true },
        });
        const roleNames = userRoles.map((ur) => ur.role.name);
        if (roleNames.length === 0) {
            const defaultRole = await this.prisma.role.findUnique({
                where: { name: 'user' },
            });
            if (defaultRole) {
                await this.prisma.userRole.create({
                    data: {
                        userId: user.id,
                        roleId: defaultRole.id,
                        assignedBy: null,
                    },
                });
                roleNames.push('user');
            }
        }
        const permissions = await this.rolesService.getAllPermissionsByRoles(roleNames);
        const jwtPayload = {
            sub: user.id,
            email: user.email,
            roles: roleNames,
            permissions,
        };
        const jwtSecret = process.env.JWT_SECRET;
        const accessToken = await this.tokenService.generateAccessToken(jwtPayload);
        const refreshToken = await this.tokenService.generateRefreshToken(user.id, deviceInfo);
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
                id: user.id,
                email: user.email,
                roles: roleNames,
            },
            expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRES_IN', 3600),
        };
    }
    async requestOtp(email) {
        return this.otpService.requestOtp(email);
    }
    async verifyOtp(email, otp, deviceInfo) {
        await this.otpService.verifyOtp(email, otp);
        let user;
        if (email === 'imamarham10@gmail.com') {
            user = {
                id: '00000000-0000-0000-0000-000000000001',
                email,
                isActive: true,
                isVerified: true,
            };
        }
        else {
            user = {
                id: 'user-uuid-placeholder',
                email,
                isActive: true,
                isVerified: true,
            };
        }
        const userRoles = await this.prisma.userRole.findMany({
            where: { userId: user.id },
            include: { role: true },
        });
        const roleNames = userRoles.map((ur) => ur.role.name);
        if (roleNames.length === 0) {
            roleNames.push('user');
        }
        const permissions = await this.rolesService.getAllPermissionsByRoles(roleNames);
        const jwtPayload = {
            sub: user.id,
            email: user.email,
            roles: roleNames,
            permissions,
        };
        const accessToken = await this.tokenService.generateAccessToken(jwtPayload);
        const refreshToken = await this.tokenService.generateRefreshToken(user.id, deviceInfo);
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
                id: user.id,
                email: user.email,
                roles: roleNames,
            },
            expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRES_IN', 3600),
        };
    }
    async refreshToken(refreshToken, deviceInfo) {
        const { userId, tokenId } = await this.tokenService.validateRefreshToken(refreshToken);
        const userRoles = await this.prisma.userRole.findMany({
            where: { userId },
            include: { role: true },
        });
        const roleNames = userRoles.map((ur) => ur.role.name);
        const permissions = await this.rolesService.getAllPermissionsByRoles(roleNames);
        const jwtPayload = {
            sub: userId,
            email: 'user@example.com',
            roles: roleNames,
            permissions,
        };
        const accessToken = await this.tokenService.generateAccessToken(jwtPayload);
        const newRefreshToken = await this.tokenService.rotateRefreshToken(tokenId, userId, deviceInfo);
        await this.tokenService.updateLastUsed(tokenId);
        return {
            access_token: accessToken,
            refresh_token: newRefreshToken,
            expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRES_IN', 3600),
        };
    }
    async logout(userId, refreshToken) {
        if (refreshToken) {
            try {
                const { tokenId } = await this.tokenService.validateRefreshToken(refreshToken);
                await this.tokenService.revokeRefreshToken(tokenId, 'logout');
            }
            catch (error) {
            }
        }
        else {
            await this.tokenService.revokeAllUserTokens(userId);
        }
        return { message: 'Logged out successfully' };
    }
    async validateJwtPayload(payload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                email: true,
                isActive: true,
                isVerified: true,
                deletedAt: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('User account is inactive');
        }
        if (user.deletedAt) {
            throw new common_1.UnauthorizedException('User account has been deleted');
        }
        return payload;
    }
    async getUserPermissions(userId) {
        const userRoles = await this.prisma.userRole.findMany({
            where: { userId },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });
        const allPermissions = new Set();
        userRoles.forEach((userRole) => {
            userRole.role.rolePermissions.forEach((rp) => {
                allPermissions.add(rp.permission.name);
            });
        });
        return Array.from(allPermissions);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        otp_service_1.OtpService,
        token_service_1.TokenService,
        roles_service_1.RolesService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map