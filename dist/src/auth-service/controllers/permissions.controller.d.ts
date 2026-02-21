import { PermissionsService } from '../services/permissions.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
export declare class PermissionsController {
    private readonly permissionsService;
    constructor(permissionsService: PermissionsService);
    getAllPermissions(): Promise<{
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
    createPermission(createPermissionDto: CreatePermissionDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        resource: string;
        action: string;
    }>;
    updatePermission(id: string, updatePermissionDto: UpdatePermissionDto): Promise<{
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
        message: string;
    }>;
}
