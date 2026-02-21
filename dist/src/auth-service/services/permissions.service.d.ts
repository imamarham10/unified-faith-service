import { PrismaService } from '../repositories/prisma.service';
export declare enum Permission {
    USERS_READ = "users:read",
    USERS_CREATE = "users:create",
    USERS_UPDATE = "users:update",
    USERS_DELETE = "users:delete",
    CONTENT_READ = "content:read",
    CONTENT_CREATE = "content:create",
    CONTENT_UPDATE = "content:update",
    CONTENT_DELETE = "content:delete",
    PAYMENTS_READ = "payments:read",
    PAYMENTS_CREATE = "payments:create",
    PAYMENTS_UPDATE = "payments:update",
    PAYMENTS_DELETE = "payments:delete",
    SUBSCRIPTIONS_READ = "subscriptions:read",
    SUBSCRIPTIONS_CREATE = "subscriptions:create",
    SUBSCRIPTIONS_UPDATE = "subscriptions:update",
    SUBSCRIPTIONS_DELETE = "subscriptions:delete",
    ADMIN_ALL = "*"
}
export declare class PermissionsService {
    private prisma;
    constructor(prisma: PrismaService);
    hasPermission(userPermissions: string[], requiredPermission: string): boolean;
    hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean;
    hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean;
    getAllPermissions(): string[];
    getAllPermissionsFromDb(): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        resource: string;
        action: string;
    }[]>;
    getPermissionById(id: string): Promise<{
        rolePermissions: ({
            role: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                slug: string;
                description: string | null;
                isSystemRole: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            roleId: string;
            permissionId: string;
        })[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        resource: string;
        action: string;
    }>;
    createPermission(data: {
        name: string;
        slug: string;
        resource: string;
        action: string;
        description?: string;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        resource: string;
        action: string;
    }>;
    updatePermission(id: string, data: {
        name?: string;
        slug?: string;
        resource?: string;
        action?: string;
        description?: string;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        resource: string;
        action: string;
    }>;
    deletePermission(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        resource: string;
        action: string;
    }>;
}
