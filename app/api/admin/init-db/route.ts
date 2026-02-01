import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// This endpoint initializes/updates the database schema
// Protected by admin secret
export async function POST(request: NextRequest) {
  try {
    // Verify admin secret
    const { secret } = await request.json();
    const adminSecret = process.env.ADMIN_SECRET || 'petpics-admin-2024';

    if (secret !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: string[] = [];

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        password_hash VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        credits_balance INTEGER DEFAULT 0,
        email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token VARCHAR(255),
        email_verification_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    results.push('✓ users table');

    // Create models table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS models (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        lora_url TEXT NOT NULL,
        trigger_word VARCHAR(50) NOT NULL,
        training_images_count INTEGER NOT NULL,
        preview_image_url TEXT,
        product_description TEXT,
        product_features JSONB,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    results.push('✓ models table');

    // Create generations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS generations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
        preset_prompt_id VARCHAR(50),
        custom_prompt TEXT,
        image_urls TEXT[],
        row_prompts TEXT[],
        image_quality_scores REAL[],
        aspect_ratio VARCHAR(50),
        credits_used INTEGER NOT NULL,
        reroll_used BOOLEAN DEFAULT FALSE,
        upscale_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    results.push('✓ generations table');

    // Create transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        credits_change INTEGER NOT NULL,
        credits_balance_after INTEGER NOT NULL,
        amount_usd DECIMAL(10, 2),
        stripe_payment_id VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    results.push('✓ transactions table');

    // Create training_images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS training_images (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        image_data BYTEA,
        file_name VARCHAR(255),
        file_size INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    results.push('✓ training_images table');

    // Create pending_trainings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pending_trainings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fal_request_id VARCHAR(255) NOT NULL,
        trigger_word VARCHAR(50) NOT NULL,
        model_name VARCHAR(255) NOT NULL,
        images_count INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'training',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    results.push('✓ pending_trainings table');

    // Create video_generations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_generations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
        source_image_url TEXT NOT NULL,
        motion_prompt TEXT NOT NULL,
        fal_request_id TEXT,
        status TEXT DEFAULT 'pending',
        video_url TEXT,
        error_message TEXT,
        credits_used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    results.push('✓ video_generations table');

    // Add missing columns (safe to run multiple times)
    const alterQueries = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP',
      'ALTER TABLE models ADD COLUMN IF NOT EXISTS preview_image_url TEXT',
      'ALTER TABLE models ADD COLUMN IF NOT EXISTS product_description TEXT',
      'ALTER TABLE models ADD COLUMN IF NOT EXISTS product_features JSONB',
      'ALTER TABLE models ADD COLUMN IF NOT EXISTS notes TEXT',
      'ALTER TABLE generations ADD COLUMN IF NOT EXISTS reroll_used BOOLEAN DEFAULT FALSE',
      'ALTER TABLE generations ADD COLUMN IF NOT EXISTS row_prompts TEXT[]',
      'ALTER TABLE generations ADD COLUMN IF NOT EXISTS image_quality_scores REAL[]',
      'ALTER TABLE generations ADD COLUMN IF NOT EXISTS aspect_ratio VARCHAR(50)',
      'ALTER TABLE generations ADD COLUMN IF NOT EXISTS upscale_used BOOLEAN DEFAULT FALSE',
    ];

    for (const query of alterQueries) {
      try {
        await pool.query(query);
      } catch (e) {
        // Column might already exist with different definition, ignore
      }
    }
    results.push('✓ added missing columns');

    // Create indexes
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)',
      'CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_generations_model_id ON generations(model_id)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_pending_trainings_user ON pending_trainings(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_pending_trainings_request ON pending_trainings(fal_request_id)',
      'CREATE INDEX IF NOT EXISTS idx_video_generations_user_id ON video_generations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_video_generations_fal_request_id ON video_generations(fal_request_id)',
    ];

    for (const query of indexQueries) {
      try {
        await pool.query(query);
      } catch (e) {
        // Index might already exist, ignore
      }
    }
    results.push('✓ created indexes');

    // Verify tables exist
    const tableCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = tableCheck.rows.map(r => r.table_name);

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      results,
      tables
    });

  } catch (error) {
    console.error('Database init error:', error);
    return NextResponse.json({
      error: 'Database initialization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
