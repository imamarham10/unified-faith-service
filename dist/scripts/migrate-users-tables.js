"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require("dotenv/config");
const pg_1 = require("pg");
const fs = require("fs");
const path = require("path");
async function migrateUsersTables() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL is not set in environment variables');
        process.exit(1);
    }
    console.log('📋 Starting migration for users tables...');
    console.log(`🔗 Connecting to database: ${databaseUrl.substring(0, 50)}...`);
    const migrationPath = path.join(__dirname, '../prisma/migrations/users_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    const pool = new pg_1.Pool({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false,
        },
    });
    try {
        const client = await pool.connect();
        console.log('✅ Connected to database');
        try {
            console.log('📝 Executing migration SQL...');
            await client.query(migrationSQL);
            console.log('✅ Migration completed successfully!');
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
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.code === '42P07') {
            console.log('ℹ️  Tables already exist. Migration skipped.');
        }
        else {
            throw error;
        }
    }
    finally {
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
//# sourceMappingURL=migrate-users-tables.js.map