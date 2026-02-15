import { PermissionsService } from '../services/permissions.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
export declare class PermissionsController {
    private readonly permissionsService;
    constructor(permissionsService: PermissionsService);
    getAllPermissions(): Promise<{
        id: string;
        description: string | null;
        name: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        resource: string;
        action: string;
    }[]>;
    getPermissionById(id: string): Promise<{
        rolePermissions: ({
            role: {
                id: string;
                description: string | null;
                name: string;
                slug: string;
                isSystemRole: boolean;
                createdAt: Date;
                updatedAt: Date;
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
        createdAt: Date;
        updatedAt: Date;
        resource: string;
        action: string;
    }>;
    createPermission(createPermissionDto: CreatePermissionDto): Promise<{
        id: string;
        description: string | null;
        name: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        resource: string;
        action: string;
    }>;
    updatePermission(id: string, updatePermissionDto: UpdatePermissionDto): Promise<{
        id: string;
        description: string | null;
        name: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        resource: string;
        action: string;
    }>;
    deletePermission(id: string): Promise<{
        message: string;
    }>;
}
