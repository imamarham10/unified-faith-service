import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
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
    createRole(createRoleDto: CreateRoleDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        isSystemRole: boolean;
    }>;
    updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        isSystemRole: boolean;
    }>;
    deleteRole(id: string): Promise<{
        message: string;
    }>;
    assignPermissions(id: string, assignPermissionsDto: AssignPermissionsDto): Promise<{
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
