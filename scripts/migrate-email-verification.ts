import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'add-email-verification.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('Running email verification migration...');
    await pool.query(sql);
    console.log('✓ Migration completed successfully!');

    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('email_verified', 'email_verification_token', 'email_verification_expires')
      ORDER BY column_name;
    `);

    console.log('\nAdded columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
