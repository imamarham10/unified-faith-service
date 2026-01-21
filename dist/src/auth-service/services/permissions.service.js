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
exports.PermissionsService = exports.Permission = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../repositories/prisma.service");
var Permission;
(function (Permission) {
    Permission["USERS_READ"] = "users:read";
    Permission["USERS_CREATE"] = "users:create";
    Permission["USERS_UPDATE"] = "users:update";
    Permission["USERS_DELETE"] = "users:delete";
    Permission["CONTENT_READ"] = "content:read";
    Permission["CONTENT_CREATE"] = "content:create";
    Permission["CONTENT_UPDATE"] = "content:update";
    Permission["CONTENT_DELETE"] = "content:delete";
    Permission["PAYMENTS_READ"] = "payments:read";
    Permission["PAYMENTS_CREATE"] = "payments:create";
    Permission["PAYMENTS_UPDATE"] = "payments:update";
    Permission["PAYMENTS_DELETE"] = "payments:delete";
    Permission["SUBSCRIPTIONS_READ"] = "subscriptions:read";
    Permission["SUBSCRIPTIONS_CREATE"] = "subscriptions:create";
    Permission["SUBSCRIPTIONS_UPDATE"] = "subscriptions:update";
    Permission["SUBSCRIPTIONS_DELETE"] = "subscriptions:delete";
    Permission["ADMIN_ALL"] = "*";
})(Permission || (exports.Permission = Permission = {}));
let PermissionsService = class PermissionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    hasPermission(userPermissions, requiredPermission) {
        if (userPermissions.includes('*')) {
            return true;
        }
        return userPermissions.includes(requiredPermission);
    }
    hasAnyPermission(userPermissions, requiredPermissions) {
        if (userPermissions.includes('*')) {
            return true;
        }
        return requiredPermissions.some((permission) => userPermissions.includes(permission));
    }
    hasAllPermissions(userPermissions, requiredPermissions) {
        if (userPermissions.includes('*')) {
            return true;
        }
        return requiredPermissions.every((permission) => userPermissions.includes(permission));
    }
    getAllPermissions() {
        return Object.values(Permission);
    }
    async getAllPermissionsFromDb() {
        return this.prisma.permission.findMany({
            orderBy: { name: 'asc' },
        });
    }
    async getPermissionById(id) {
        return this.prisma.permission.findUnique({
            where: { id },
            include: {
                rolePermissions: {
                    include: {
                        role: true,
                    },
                },
            },
        });
    }
    async createPermission(data) {
        return this.prisma.permission.create({
            data: {
                name: data.name,
                slug: data.slug,
                resource: data.resource,
                action: data.action,
                description: data.description,
            },
        });
    }
    async updatePermission(id, data) {
        return this.prisma.permission.update({
            where: { id },
            data,
        });
    }
    async deletePermission(id) {
        return this.prisma.permission.delete({
            where: { id },
        });
    }
};
exports.PermissionsService = PermissionsService;
exports.PermissionsService = PermissionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionsService);
//# sourceMappingURL=permissions.service.js.map