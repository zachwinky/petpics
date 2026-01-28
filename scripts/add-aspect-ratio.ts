import { Pool } from 'pg';

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    },
  });

  try {
    console.log('Adding aspect_ratio column to generations table...');

    // Add the aspect_ratio column with default value
    await pool.query(`
      ALTER TABLE generations
      ADD COLUMN IF NOT EXISTS aspect_ratio VARCHAR(50) DEFAULT 'instagram-feed'
    `);

    console.log('Successfully added aspect_ratio column to generations table');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch(console.error);
