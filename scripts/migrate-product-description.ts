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
    const sqlPath = path.join(__dirname, 'add-product-description.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('Running product_description migration...');
    await pool.query(sql);
    console.log('✓ Migration completed successfully!');

    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'models'
        AND column_name = 'product_description';
    `);

    if (result.rows.length > 0) {
      console.log('\nAdded column:');
      console.log(`  - product_description: ${result.rows[0].data_type}`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
