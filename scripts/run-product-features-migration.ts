import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // Add the product_features JSONB column
    await pool.query(`
      ALTER TABLE models ADD COLUMN IF NOT EXISTS product_features JSONB
    `);
    console.log('Added product_features column to models table');

    console.log('Migration complete!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
