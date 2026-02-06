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
    // Add pet_type column to models table
    await pool.query(`
      ALTER TABLE models ADD COLUMN IF NOT EXISTS pet_type VARCHAR(10) DEFAULT 'dog'
    `);
    console.log('Added pet_type column to models table');

    // Create admin_config table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_config (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created admin_config table');

    // Initialize sample prompt configuration
    await pool.query(`
      INSERT INTO admin_config (key, value) VALUES
        ('sample_prompt_ids', '["studio-white", "park-scene"]')
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('Initialized sample_prompt_ids config');

    console.log('Migration complete!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
