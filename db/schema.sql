-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255), -- for email/password auth
  google_id VARCHAR(255) UNIQUE, -- for Google OAuth
  credits_balance INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Models table (trained LoRA models)
CREATE TABLE IF NOT EXISTS models (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- user-friendly name for the model
  lora_url TEXT NOT NULL, -- URL from fal.ai
  trigger_word VARCHAR(50) NOT NULL,
  training_images_count INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generations table (generated images history)
CREATE TABLE IF NOT EXISTS generations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
  preset_prompt_id VARCHAR(50), -- references preset from lib/presetPrompts.ts
  custom_prompt TEXT,
  image_urls TEXT[], -- array of generated image URLs
  credits_used INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table (credits purchases and usage)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'purchase', 'training', 'generation'
  credits_change INTEGER NOT NULL, -- positive for purchases, negative for usage
  credits_balance_after INTEGER NOT NULL,
  amount_usd DECIMAL(10, 2), -- for purchases
  stripe_payment_id VARCHAR(255), -- for purchases
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training images table (store images for potential retraining)
CREATE TABLE IF NOT EXISTS training_images (
  id SERIAL PRIMARY KEY,
  model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
  image_data BYTEA, -- store actual image data
  file_name VARCHAR(255),
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_model_id ON generations(model_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_images_model_id ON training_images(model_id);
