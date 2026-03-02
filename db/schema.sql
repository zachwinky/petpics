-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255), -- for email/password auth
  google_id VARCHAR(255) UNIQUE, -- for Google OAuth
  credits_balance INTEGER DEFAULT 0,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  email_verification_expires TIMESTAMP,
  banned_at TIMESTAMP,
  banned_by TEXT,
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
  pet_type TEXT DEFAULT 'dog', -- 'dog' or 'cat'
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
  preset_prompt_id VARCHAR(50), -- references preset from lib/presetPrompts.ts
  custom_prompt TEXT,
  image_urls TEXT[], -- array of generated image URLs
  row_prompts TEXT[], -- prompt used for each row/image
  image_quality_scores FLOAT[], -- CLIP quality scores per image
  credits_used INTEGER NOT NULL,
  reroll_used BOOLEAN DEFAULT FALSE,
  upscale_used BOOLEAN DEFAULT FALSE,
  aspect_ratio TEXT DEFAULT 'instagram-feed',
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

-- Pending trainings (track in-progress model training)
CREATE TABLE IF NOT EXISTS pending_trainings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  fal_request_id TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'training', -- 'training', 'completed', 'failed'
  trigger_word VARCHAR(50) NOT NULL,
  model_name VARCHAR(255),
  pet_type TEXT DEFAULT 'dog',
  images_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Video generations
CREATE TABLE IF NOT EXISTS video_generations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
  source_image_url TEXT NOT NULL,
  motion_prompt TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  video_url TEXT,
  fal_request_id TEXT,
  error_message TEXT,
  credits_used INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Admin config (key-value store for dynamic settings)
CREATE TABLE IF NOT EXISTS admin_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_model_id ON generations(model_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_images_model_id ON training_images(model_id);
CREATE INDEX IF NOT EXISTS idx_pending_trainings_user_id ON pending_trainings(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_trainings_status ON pending_trainings(status);
CREATE INDEX IF NOT EXISTS idx_video_generations_user_id ON video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_model_id ON video_generations(model_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_status ON video_generations(status);

-- Print Shop tables

-- Product catalog (seeded from Printful variant IDs)
CREATE TABLE IF NOT EXISTS print_products (
  id SERIAL PRIMARY KEY,
  product_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  size_label TEXT NOT NULL,
  printful_variant_id INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  min_image_width_px INTEGER NOT NULL,
  min_image_height_px INTEGER NOT NULL,
  orientation TEXT,
  options JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Print orders
CREATE TABLE IF NOT EXISTS print_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT NOT NULL,
  printful_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'payment_confirmed'
    CHECK (status IN ('payment_confirmed','submitted_to_printful','in_production','shipped','delivered','failed','refunded')),
  shipping_name TEXT NOT NULL,
  shipping_address_1 TEXT NOT NULL,
  shipping_address_2 TEXT,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT,
  shipping_zip TEXT NOT NULL,
  shipping_country TEXT NOT NULL DEFAULT 'US',
  shipping_method TEXT,
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  tracking_number TEXT,
  tracking_url TEXT,
  estimated_delivery_min DATE,
  estimated_delivery_max DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order line items
CREATE TABLE IF NOT EXISTS print_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES print_orders(id) ON DELETE CASCADE NOT NULL,
  generation_id INTEGER REFERENCES generations(id) ON DELETE SET NULL,
  image_index INTEGER NOT NULL DEFAULT 0,
  printful_variant_id INTEGER NOT NULL,
  printful_file_id INTEGER,
  product_type TEXT NOT NULL,
  product_size TEXT NOT NULL,
  product_options JSONB DEFAULT '{}',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Studio portraits (saved selections from Studio overlay)
CREATE TABLE IF NOT EXISTS studio_portraits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  model_id INTEGER REFERENCES models(id) ON DELETE CASCADE NOT NULL,
  generation_id INTEGER REFERENCES generations(id) ON DELETE SET NULL,
  image_index INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  scene_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cart snapshots (server-side mirror of localStorage cart for admin visibility)
CREATE TABLE IF NOT EXISTS cart_snapshots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  items JSONB NOT NULL DEFAULT '[]',
  item_count INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cart_snapshots_user ON cart_snapshots(user_id);

CREATE INDEX IF NOT EXISTS idx_print_products_type ON print_products(product_type);
CREATE INDEX IF NOT EXISTS idx_print_products_active ON print_products(active);
CREATE INDEX IF NOT EXISTS idx_print_orders_user_id ON print_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_status ON print_orders(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_print_orders_stripe ON print_orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_printful ON print_orders(printful_order_id);
CREATE INDEX IF NOT EXISTS idx_print_order_items_order ON print_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_studio_portraits_user ON studio_portraits(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_portraits_model ON studio_portraits(model_id);

-- User events (funnel analytics / behavior tracking)
CREATE TABLE IF NOT EXISTS user_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_events_user ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event ON user_events(event);
CREATE INDEX IF NOT EXISTS idx_user_events_created ON user_events(created_at);
