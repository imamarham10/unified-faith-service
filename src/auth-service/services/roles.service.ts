import { Injectable } from '@nestjs/common';
import { PrismaService } from '../repositories/prisma.service';

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
  PREMIUM_USER = 'premium_user',
}

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get permissions for a single role
   */
  async getPermissionsByRole(roleName: string): Promise<string[]> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return [];
    }

    const permissions = role.rolePermissions.map((rp) => rp.permission.name);
    
    // If admin role with * permission, return ['*']
    if (permissions.includes('*')) {
      return ['*'];
    }

    return permissions;
  }

  /**
   * Get all permissions for multiple roles (aggregated)
   */
  async getAllPermissionsByRoles(roleNames: string[]): Promise<string[]> {
    const allPermissions = new Set<string>();

    for (const roleName of roleNames) {
      const permissions = await this.getPermissionsByRole(roleName);
      
      if (permissions.includes('*')) {
        allPermissions.add('*');
      } else {
        permissions.forEach((permission) => allPermissions.add(permission));
      }
    }

    return Array.from(allPermissions);
  }

  /**
   * Check if role is valid
   */
  isValidRole(role: string): boolean {
    return Object.values(Role).includes(role as Role);
  }

  /**
   * Get all roles
   */
  async getAllRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Create a new role
   */
  async createRole(data: {
    name: string;
    slug: string;
    description?: string;
    isSystemRole?: boolean;
  }) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        isSystemRole: data.isSystemRole || false,
      },
    });
  }

  /**
   * Update a role
   */
  async updateRole(id: string, data: { name?: string; slug?: string; description?: string }) {
    return this.prisma.role.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a role
   */
  async deleteRole(id: string) {
    return this.prisma.role.delete({
      where: { id },
    });
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissions(roleId: string, permissionIds: string[]) {
    // Remove existing permissions first
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Add new permissions
    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return this.getRoleById(roleId);
  }
}
