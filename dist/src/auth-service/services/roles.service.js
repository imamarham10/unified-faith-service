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
exports.RolesService = exports.Role = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../repositories/prisma.service");
var Role;
(function (Role) {
    Role["ADMIN"] = "admin";
    Role["USER"] = "user";
    Role["MODERATOR"] = "moderator";
    Role["PREMIUM_USER"] = "premium_user";
})(Role || (exports.Role = Role = {}));
let RolesService = class RolesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPermissionsByRole(roleName) {
        const role = await this.prisma.role.findUnique({
            where: { name: roleName },
            include: {
                rolePermissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
        if (!role) {
            return [];
        }
        const permissions = role.rolePermissions.map((rp) => rp.permission.name);
        if (permissions.includes('*')) {
            return ['*'];
        }
        return permissions;
    }
    async getAllPermissionsByRoles(roleNames) {
        const allPermissions = new Set();
        for (const roleName of roleNames) {
            const permissions = await this.getPermissionsByRole(roleName);
            if (permissions.includes('*')) {
                allPermissions.add('*');
            }
            else {
                permissions.forEach((permission) => allPermissions.add(permission));
            }
        }
        return Array.from(allPermissions);
    }
    isValidRole(role) {
        return Object.values(Role).includes(role);
    }
    async getAllRoles() {
        return this.prisma.role.findMany({
            orderBy: { name: 'asc' },
        });
    }
    async getRoleById(id) {
        return this.prisma.role.findUnique({
            where: { id },
            include: {
                rolePermissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
    }
    async createRole(data) {
        return this.prisma.role.create({
            data: {
                name: data.name,
                slug: data.slug,
                description: data.description,
                isSystemRole: data.isSystemRole || false,
            },
        });
    }
    async updateRole(id, data) {
        return this.prisma.role.update({
            where: { id },
            data,
        });
    }
    async deleteRole(id) {
        return this.prisma.role.delete({
            where: { id },
        });
    }
    async assignPermissions(roleId, permissionIds) {
        await this.prisma.rolePermission.deleteMany({
            where: { roleId },
        });
        if (permissionIds.length > 0) {
            await this.prisma.rolePermission.createMany({
                data: permissionIds.map((permissionId) => ({
                    roleId,
                    permissionId,
                })),
                skipDuplicates: true,
            });
        }
        return this.getRoleById(roleId);
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RolesService);
//# sourceMappingURL=roles.service.js.map