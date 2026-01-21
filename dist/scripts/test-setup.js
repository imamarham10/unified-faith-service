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
const pool = new pg_1.Pool({ connectionString: databaseUrl });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function setupTestUser() {
    console.log('🧪 Setting up test user for login...');
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const testEmail = 'imamarham10@gmail.com';
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (!adminRole) {
        console.error('❌ Admin role not found. Please run seed first.');
        process.exit(1);
    }
    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: testUserId,
                roleId: adminRole.id,
            },
        },
        update: {},
        create: {
            userId: testUserId,
            roleId: adminRole.id,
            assignedBy: null,
        },
    });
    console.log('✅ Test user role assigned');
    console.log(`📧 Email: ${testEmail}`);
    console.log(`👤 User ID: ${testUserId}`);
    console.log(`🔑 Role: admin`);
    console.log('');
    console.log('✅ AuthService is already configured with this user ID!');
    console.log('   You can now test login with: imamarham10@gmail.com');
}
setupTestUser()
    .catch((e) => {
    console.error('❌ Setup failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});
//# sourceMappingURL=test-setup.js.map