-- Full database schema for Petpics
-- Run this script to initialize or update the database with all tables

-- Users table
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
);

-- Models table (trained LoRA models)
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
);

-- Generations table (generated images history)
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
);

-- Transactions table (credits purchases and usage)
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
);

-- Training images table
CREATE TABLE IF NOT EXISTS training_images (
  id SERIAL PRIMARY KEY,
  model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
  image_data BYTEA,
  file_name VARCHAR(255),
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pending trainings table
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
);

-- Video generations table
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
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_model_id ON generations(model_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_images_model_id ON training_images(model_id);
CREATE INDEX IF NOT EXISTS idx_pending_trainings_user ON pending_trainings(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_trainings_request ON pending_trainings(fal_request_id);
CREATE INDEX IF NOT EXISTS idx_pending_trainings_status ON pending_trainings(status);
CREATE INDEX IF NOT EXISTS idx_video_generations_user_id ON video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_model_id ON video_generations(model_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_status ON video_generations(status);
CREATE INDEX IF NOT EXISTS idx_video_generations_fal_request_id ON video_generations(fal_request_id);

-- Add any missing columns to existing tables (safe to run multiple times)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;
ALTER TABLE models ADD COLUMN IF NOT EXISTS preview_image_url TEXT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS product_description TEXT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS product_features JSONB;
ALTER TABLE models ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS reroll_used BOOLEAN DEFAULT FALSE;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS row_prompts TEXT[];
ALTER TABLE generations ADD COLUMN IF NOT EXISTS image_quality_scores REAL[];
ALTER TABLE generations ADD COLUMN IF NOT EXISTS aspect_ratio VARCHAR(50);
ALTER TABLE generations ADD COLUMN IF NOT EXISTS upscale_used BOOLEAN DEFAULT FALSE;
