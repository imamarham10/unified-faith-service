"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
}
const pool = new pg_1.Pool({
    connectionString: databaseUrl?.replace('sslmode=require', ''),
    ssl: { rejectUnauthorized: false }
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 Starting database seed...');
    const roles = [
        {
            name: 'admin',
            slug: 'admin',
            description: 'Full system access',
            isSystemRole: true,
        },
        {
            name: 'moderator',
            slug: 'moderator',
            description: 'Content moderation access',
            isSystemRole: true,
        },
        {
            name: 'user',
            slug: 'user',
            description: 'Basic authenticated user',
            isSystemRole: true,
        },
        {
            name: 'premium_user',
            slug: 'premium_user',
            description: 'Premium subscription user',
            isSystemRole: true,
        },
    ];
    console.log('📝 Creating roles...');
    for (const role of roles) {
        await prisma.role.upsert({
            where: { name: role.name },
            update: {},
            create: role,
        });
    }
    console.log('✅ Roles created');
    const permissions = [
        { name: 'users:read', slug: 'users-read', resource: 'users', action: 'read' },
        { name: 'users:create', slug: 'users-create', resource: 'users', action: 'create' },
        { name: 'users:update', slug: 'users-update', resource: 'users', action: 'update' },
        { name: 'users:delete', slug: 'users-delete', resource: 'users', action: 'delete' },
        { name: 'content:read', slug: 'content-read', resource: 'content', action: 'read' },
        { name: 'content:create', slug: 'content-create', resource: 'content', action: 'create' },
        { name: 'content:update', slug: 'content-update', resource: 'content', action: 'update' },
        { name: 'content:delete', slug: 'content-delete', resource: 'content', action: 'delete' },
        { name: 'content:moderate', slug: 'content-moderate', resource: 'content', action: 'moderate' },
        { name: 'payments:read', slug: 'payments-read', resource: 'payments', action: 'read' },
        { name: 'payments:create', slug: 'payments-create', resource: 'payments', action: 'create' },
        { name: 'payments:update', slug: 'payments-update', resource: 'payments', action: 'update' },
        { name: 'payments:delete', slug: 'payments-delete', resource: 'payments', action: 'delete' },
        { name: 'payments:refund', slug: 'payments-refund', resource: 'payments', action: 'refund' },
        { name: 'subscriptions:read', slug: 'subscriptions-read', resource: 'subscriptions', action: 'read' },
        { name: 'subscriptions:create', slug: 'subscriptions-create', resource: 'subscriptions', action: 'create' },
        { name: 'subscriptions:update', slug: 'subscriptions-update', resource: 'subscriptions', action: 'update' },
        { name: 'subscriptions:delete', slug: 'subscriptions-delete', resource: 'subscriptions', action: 'delete' },
        { name: 'subscriptions:manage_family', slug: 'subscriptions-manage-family', resource: 'subscriptions', action: 'manage_family' },
        { name: 'ai_guru:chat', slug: 'ai-guru-chat', resource: 'ai_guru', action: 'chat' },
        { name: 'ai_guru:unlimited', slug: 'ai-guru-unlimited', resource: 'ai_guru', action: 'unlimited' },
        { name: '*', slug: 'admin-all', resource: '*', action: '*' },
    ];
    console.log('📝 Creating permissions...');
    for (const permission of permissions) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: {},
            create: permission,
        });
    }
    console.log('✅ Permissions created');
    console.log('📝 Assigning permissions to roles...');
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    const allPermissions = await prisma.permission.findMany();
    if (adminRole) {
        for (const permission of allPermissions) {
            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId: adminRole.id,
                        permissionId: permission.id,
                    },
                },
                update: {},
                create: {
                    roleId: adminRole.id,
                    permissionId: permission.id,
                },
            });
        }
    }
    const moderatorRole = await prisma.role.findUnique({ where: { name: 'moderator' } });
    const moderatorPermissions = ['users:read', 'users:update', 'content:read', 'content:update', 'content:delete', 'content:moderate'];
    if (moderatorRole) {
        for (const permName of moderatorPermissions) {
            const permission = await prisma.permission.findUnique({ where: { name: permName } });
            if (permission) {
                await prisma.rolePermission.upsert({
                    where: {
                        roleId_permissionId: {
                            roleId: moderatorRole.id,
                            permissionId: permission.id,
                        },
                    },
                    update: {},
                    create: {
                        roleId: moderatorRole.id,
                        permissionId: permission.id,
                    },
                });
            }
        }
    }
    const premiumUserRole = await prisma.role.findUnique({ where: { name: 'premium_user' } });
    const premiumPermissions = ['users:read', 'content:read', 'content:create', 'payments:read', 'subscriptions:read'];
    if (premiumUserRole) {
        for (const permName of premiumPermissions) {
            const permission = await prisma.permission.findUnique({ where: { name: permName } });
            if (permission) {
                await prisma.rolePermission.upsert({
                    where: {
                        roleId_permissionId: {
                            roleId: premiumUserRole.id,
                            permissionId: permission.id,
                        },
                    },
                    update: {},
                    create: {
                        roleId: premiumUserRole.id,
                        permissionId: permission.id,
                    },
                });
            }
        }
    }
    const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
    const userPermissions = ['users:read', 'content:read', 'payments:read', 'subscriptions:read'];
    if (userRole) {
        for (const permName of userPermissions) {
            const permission = await prisma.permission.findUnique({ where: { name: permName } });
            if (permission) {
                await prisma.rolePermission.upsert({
                    where: {
                        roleId_permissionId: {
                            roleId: userRole.id,
                            permissionId: permission.id,
                        },
                    },
                    update: {},
                    create: {
                        roleId: userRole.id,
                        permissionId: permission.id,
                    },
                });
            }
        }
    }
    console.log('✅ Permissions assigned to roles');
    console.log('🎉 Database seed completed!');
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map