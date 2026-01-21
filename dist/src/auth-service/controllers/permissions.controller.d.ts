import { PermissionsService } from '../services/permissions.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
export declare class PermissionsController {
    private readonly permissionsService;
    constructor(permissionsService: PermissionsService);
    getAllPermissions(): Promise<{
        id: string;
        name: string;
        slug: string;
        resource: string;
        action: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getPermissionById(id: string): Promise<{
        rolePermissions: ({
            role: {
                id: string;
                name: string;
                slug: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
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
        id: string;
        name: string;
        slug: string;
        resource: string;
        action: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createPermission(createPermissionDto: CreatePermissionDto): Promise<{
        id: string;
        name: string;
        slug: string;
        resource: string;
        action: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updatePermission(id: string, updatePermissionDto: UpdatePermissionDto): Promise<{
        id: string;
        name: string;
        slug: string;
        resource: string;
        action: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deletePermission(id: string): Promise<{
        message: string;
    }>;
}
