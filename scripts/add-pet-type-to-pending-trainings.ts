import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // Add pet_type column to pending_trainings table
    await pool.query(`
      ALTER TABLE pending_trainings ADD COLUMN IF NOT EXISTS pet_type VARCHAR(10) DEFAULT 'dog'
    `);
    console.log('Added pet_type column to pending_trainings table');

    console.log('Migration complete!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
