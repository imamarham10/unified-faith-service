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
        createdAt: Date;
        updatedAt: Date;
        isSystemRole: boolean;
    }[]>;
    getRoleById(id: string): Promise<{
        rolePermissions: ({
            permission: {
                id: string;
                name: string;
                slug: string;
                resource: string;
                action: string;
                description: string | null;
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
        name: string;
        slug: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        isSystemRole: boolean;
    }>;
    createRole(createRoleDto: CreateRoleDto): Promise<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        isSystemRole: boolean;
    }>;
    updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        isSystemRole: boolean;
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
                resource: string;
                action: string;
                description: string | null;
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
        name: string;
        slug: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        isSystemRole: boolean;
    }>;
}
