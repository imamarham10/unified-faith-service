import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
    getAllRoles(): Promise<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        isSystemRole: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getRoleById(id: string): Promise<{
        rolePermissions: ({
            permission: {
                id: string;
                name: string;
                slug: string;
                description: string | null;
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
        name: string;
        slug: string;
        description: string | null;
        isSystemRole: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createRole(createRoleDto: CreateRoleDto): Promise<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        isSystemRole: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        isSystemRole: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteRole(id: string): Promise<{
        message: string;
    }>;
    assignPermissions(id: string, assignPermissionsDto: AssignPermissionsDto): Promise<{
        rolePermissions: ({
            permission: {
                id: string;
                name: string;
                slug: string;
                description: string | null;
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
        name: string;
        slug: string;
        description: string | null;
        isSystemRole: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
