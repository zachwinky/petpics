import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // Add upscale_used column to generations table
    await pool.query(`
      ALTER TABLE generations
      ADD COLUMN IF NOT EXISTS upscale_used BOOLEAN DEFAULT FALSE
    `);
    console.log('Added upscale_used column to generations table');

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

run();
