import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { prismaSchemaOptions } from '../src/common/utils/db-schema';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Use the same adapter pattern as PrismaService
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool, prismaSchemaOptions());
const prisma = new PrismaClient({ adapter });

async function setupTestUser() {
  console.log('🧪 Setting up test user for login...');

  // Use a fixed UUID for testing (so we can hardcode it in AuthService)
  const testUserId = '00000000-0000-0000-0000-000000000001';
  const testEmail = 'imamarham10@gmail.com';

  // Get admin role
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  
  if (!adminRole) {
    console.error('❌ Admin role not found. Please run seed first.');
    process.exit(1);
  }

  // Create user role assignment for testing
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
      assignedBy: null, // Self-assigned for test
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
