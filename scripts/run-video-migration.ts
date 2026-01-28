import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // Create video_generations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_generations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
        source_image_url TEXT NOT NULL,
        motion_prompt TEXT NOT NULL,
        fal_request_id TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        video_url TEXT,
        error_message TEXT,
        credits_used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    console.log('Created video_generations table');

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_video_generations_user_id ON video_generations(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_video_generations_model_id ON video_generations(model_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_video_generations_status ON video_generations(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_video_generations_fal_request_id ON video_generations(fal_request_id)');
    console.log('Created indexes');

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

run();
