import { PrismaService } from '../repositories/prisma.service';
export declare enum Role {
    ADMIN = "admin",
    USER = "user",
    MODERATOR = "moderator",
    PREMIUM_USER = "premium_user"
}
export declare class RolesService {
    private prisma;
    constructor(prisma: PrismaService);
    getPermissionsByRole(roleName: string): Promise<string[]>;
    getAllPermissionsByRoles(roleNames: string[]): Promise<string[]>;
    isValidRole(role: string): boolean;
    getAllRoles(): Promise<{
        id: string;
        description: string | null;
        name: string;
        slug: string;
        isSystemRole: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getRoleById(id: string): Promise<{
        rolePermissions: ({
            permission: {
                id: string;
                description: string | null;
                name: string;
                slug: string;
                createdAt: Date;
                updatedAt: Date;
                resource: string;
                action: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        description: string | null;
        name: string;
        slug: string;
        isSystemRole: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createRole(data: {
        name: string;
        slug: string;
        description?: string;
        isSystemRole?: boolean;
    }): Promise<{
        id: string;
        description: string | null;
        name: string;
        slug: string;
        isSystemRole: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateRole(id: string, data: {
        name?: string;
        slug?: string;
        description?: string;
    }): Promise<{
        id: string;
        description: string | null;
        name: string;
        slug: string;
        isSystemRole: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteRole(id: string): Promise<{
        id: string;
        description: string | null;
        name: string;
        slug: string;
        isSystemRole: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    assignPermissions(roleId: string, permissionIds: string[]): Promise<{
        rolePermissions: ({
            permission: {
                id: string;
                description: string | null;
                name: string;
                slug: string;
                createdAt: Date;
                updatedAt: Date;
                resource: string;
                action: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        description: string | null;
        name: string;
        slug: string;
        isSystemRole: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
