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
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        isSystemRole: boolean;
    }[]>;
    getRoleById(id: string): Promise<{
        rolePermissions: ({
            permission: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                slug: string;
                description: string | null;
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
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        isSystemRole: boolean;
    }>;
    createRole(data: {
        name: string;
        slug: string;
        description?: string;
        isSystemRole?: boolean;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        isSystemRole: boolean;
    }>;
    updateRole(id: string, data: {
        name?: string;
        slug?: string;
        description?: string;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        isSystemRole: boolean;
    }>;
    deleteRole(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        isSystemRole: boolean;
    }>;
    assignPermissions(roleId: string, permissionIds: string[]): Promise<{
        rolePermissions: ({
            permission: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                slug: string;
                description: string | null;
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
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        isSystemRole: boolean;
    }>;
}
