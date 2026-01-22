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
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../repositories/prisma.service");
let ProfileService = class ProfileService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    formatDate(date) {
        if (!date)
            return undefined;
        const d = new Date(date);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        const profile = await this.prisma.userProfile.findUnique({
            where: { userId },
        });
        if (!profile) {
            return this.createDefaultProfile(userId, user);
        }
        return {
            id: profile.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone || undefined,
            avatarUrl: profile.avatarUrl || undefined,
            bio: profile.bio || undefined,
            dateOfBirth: this.formatDate(profile.dateOfBirth),
            gender: profile.gender || undefined,
            address: profile.address || undefined,
            socialLinks: profile.socialLinks || undefined,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
        };
    }
    async updateProfile(userId, updateProfileDto) {
        const existingProfile = await this.prisma.userProfile.findUnique({
            where: { userId },
        });
        let profile;
        if (!existingProfile) {
            profile = await this.prisma.userProfile.create({
                data: {
                    userId,
                    avatarUrl: updateProfileDto.avatarUrl,
                    bio: updateProfileDto.bio,
                    dateOfBirth: updateProfileDto.dateOfBirth
                        ? new Date(updateProfileDto.dateOfBirth)
                        : null,
                    gender: updateProfileDto.gender,
                    address: updateProfileDto.address
                        ? JSON.parse(JSON.stringify(updateProfileDto.address))
                        : null,
                    socialLinks: updateProfileDto.socialLinks
                        ? JSON.parse(JSON.stringify(updateProfileDto.socialLinks))
                        : null,
                },
            });
        }
        else {
            const updateData = {};
            if (updateProfileDto.avatarUrl !== undefined) {
                updateData.avatarUrl = updateProfileDto.avatarUrl;
            }
            if (updateProfileDto.bio !== undefined) {
                updateData.bio = updateProfileDto.bio;
            }
            if (updateProfileDto.dateOfBirth !== undefined) {
                updateData.dateOfBirth = updateProfileDto.dateOfBirth
                    ? new Date(updateProfileDto.dateOfBirth)
                    : null;
            }
            if (updateProfileDto.gender !== undefined) {
                updateData.gender = updateProfileDto.gender;
            }
            if (updateProfileDto.address !== undefined) {
                updateData.address = updateProfileDto.address
                    ? JSON.parse(JSON.stringify(updateProfileDto.address))
                    : null;
            }
            if (updateProfileDto.socialLinks !== undefined) {
                updateData.socialLinks = updateProfileDto.socialLinks
                    ? JSON.parse(JSON.stringify(updateProfileDto.socialLinks))
                    : null;
            }
            profile = await this.prisma.userProfile.update({
                where: { userId },
                data: updateData,
            });
        }
        if (updateProfileDto.firstName || updateProfileDto.lastName || updateProfileDto.phone !== undefined) {
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    ...(updateProfileDto.firstName && { firstName: updateProfileDto.firstName }),
                    ...(updateProfileDto.lastName && { lastName: updateProfileDto.lastName }),
                    ...(updateProfileDto.phone !== undefined && { phone: updateProfileDto.phone || null }),
                },
            });
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
            },
        });
        return {
            id: profile.id,
            email: user?.email || '',
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            phone: user?.phone || undefined,
            avatarUrl: profile.avatarUrl || undefined,
            bio: profile.bio || undefined,
            dateOfBirth: this.formatDate(profile.dateOfBirth),
            gender: profile.gender || undefined,
            address: profile.address || undefined,
            socialLinks: profile.socialLinks || undefined,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
        };
    }
    async createProfile(userId, updateProfileDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        const existingProfile = await this.prisma.userProfile.findUnique({
            where: { userId },
        });
        if (existingProfile) {
            throw new common_1.ConflictException(`Profile for user ${userId} already exists. Use PUT to update.`);
        }
        if (updateProfileDto.firstName || updateProfileDto.lastName || updateProfileDto.phone !== undefined) {
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    ...(updateProfileDto.firstName && { firstName: updateProfileDto.firstName }),
                    ...(updateProfileDto.lastName && { lastName: updateProfileDto.lastName }),
                    ...(updateProfileDto.phone !== undefined && { phone: updateProfileDto.phone || null }),
                },
            });
        }
        const updatedUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
            },
        });
        const profile = await this.prisma.userProfile.create({
            data: {
                userId,
                avatarUrl: updateProfileDto.avatarUrl,
                bio: updateProfileDto.bio,
                dateOfBirth: updateProfileDto.dateOfBirth
                    ? new Date(updateProfileDto.dateOfBirth)
                    : null,
                gender: updateProfileDto.gender,
                address: updateProfileDto.address
                    ? JSON.parse(JSON.stringify(updateProfileDto.address))
                    : null,
                socialLinks: updateProfileDto.socialLinks
                    ? JSON.parse(JSON.stringify(updateProfileDto.socialLinks))
                    : null,
            },
        });
        return {
            id: profile.id,
            email: updatedUser?.email || user.email,
            firstName: updatedUser?.firstName || user.firstName,
            lastName: updatedUser?.lastName || user.lastName,
            phone: updatedUser?.phone || user.phone || undefined,
            avatarUrl: profile.avatarUrl || undefined,
            bio: profile.bio || undefined,
            dateOfBirth: this.formatDate(profile.dateOfBirth),
            gender: profile.gender || undefined,
            address: profile.address || undefined,
            socialLinks: profile.socialLinks || undefined,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
        };
    }
    async getProfileByUserId(userId) {
        return this.getProfile(userId);
    }
    async createDefaultProfile(userId, user) {
        if (!user) {
            const fetchedUser = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                },
            });
            if (!fetchedUser) {
                throw new common_1.NotFoundException(`User with ID ${userId} not found`);
            }
            user = fetchedUser;
        }
        const profile = await this.prisma.userProfile.create({
            data: {
                userId,
            },
        });
        return {
            id: profile.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone || undefined,
            avatarUrl: undefined,
            bio: undefined,
            dateOfBirth: undefined,
            gender: undefined,
            address: undefined,
            socialLinks: undefined,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
        };
    }
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProfileService);
//# sourceMappingURL=profile.service.js.map