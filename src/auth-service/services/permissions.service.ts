import { Injectable } from '@nestjs/common';
import { PrismaService } from '../repositories/prisma.service';

export enum Permission {
  // User permissions
  USERS_READ = 'users:read',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',

  // Content permissions
  CONTENT_READ = 'content:read',
  CONTENT_CREATE = 'content:create',
  CONTENT_UPDATE = 'content:update',
  CONTENT_DELETE = 'content:delete',

  // Payment permissions
  PAYMENTS_READ = 'payments:read',
  PAYMENTS_CREATE = 'payments:create',
  PAYMENTS_UPDATE = 'payments:update',
  PAYMENTS_DELETE = 'payments:delete',

  // Subscription permissions
  SUBSCRIPTIONS_READ = 'subscriptions:read',
  SUBSCRIPTIONS_CREATE = 'subscriptions:create',
  SUBSCRIPTIONS_UPDATE = 'subscriptions:update',
  SUBSCRIPTIONS_DELETE = 'subscriptions:delete',

  // Admin permissions
  ADMIN_ALL = '*',
}

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    if (userPermissions.includes('*')) {
      return true; // Admin has all permissions
    }
    return userPermissions.includes(requiredPermission);
  }

  hasAnyPermission(
    userPermissions: string[],
    requiredPermissions: string[],
  ): boolean {
    if (userPermissions.includes('*')) {
      return true;
    }
    return requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );
  }

  hasAllPermissions(
    userPermissions: string[],
    requiredPermissions: string[],
  ): boolean {
    if (userPermissions.includes('*')) {
      return true;
    }
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }

  getAllPermissions(): string[] {
    return Object.values(Permission);
  }

  /**
   * Get all permissions from database
   */
  async getAllPermissionsFromDb() {
    return this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(id: string) {
    return this.prisma.permission.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Create a new permission
   */
  async createPermission(data: {
    name: string;
    slug: string;
    resource: string;
    action: string;
    description?: string;
  }) {
    return this.prisma.permission.create({
      data: {
        name: data.name,
        slug: data.slug,
        resource: data.resource,
        action: data.action,
        description: data.description,
      },
    });
  }

  /**
   * Update a permission
   */
  async updatePermission(
    id: string,
    data: { name?: string; slug?: string; resource?: string; action?: string; description?: string },
  ) {
    return this.prisma.permission.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a permission
   */
  async deletePermission(id: string) {
    return this.prisma.permission.delete({
      where: { id },
    });
  }
}
