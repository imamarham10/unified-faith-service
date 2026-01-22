// Workaround for Aiven self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import 'dotenv/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function migrateUsersTables() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    process.exit(1);
  }

  console.log('📋 Starting migration for users tables...');
  console.log(`🔗 Connecting to database: ${databaseUrl.substring(0, 50)}...`);

  // Read migration SQL file
  const migrationPath = path.join(__dirname, '../prisma/migrations/users_tables.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Create connection pool
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false, // Accept self-signed certificates (required for Aiven)
    },
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database');

    try {
      // Execute migration
      console.log('📝 Executing migration SQL...');
      await client.query(migrationSQL);
      console.log('✅ Migration completed successfully!');
      
      // Verify tables were created
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('user_profiles', 'user_preferences', 'device_tokens')
        ORDER BY table_name;
      `);
      
      console.log('\n📊 Created tables:');
      result.rows.forEach((row) => {
        console.log(`  ✅ ${row.table_name}`);
      });
      
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Tables already exist. Migration skipped.');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

migrateUsersTables()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
