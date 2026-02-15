import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
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
    createRole(createRoleDto: CreateRoleDto): Promise<{
        id: string;
        description: string | null;
        name: string;
        slug: string;
        isSystemRole: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<{
        id: string;
        description: string | null;
        name: string;
        slug: string;
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
