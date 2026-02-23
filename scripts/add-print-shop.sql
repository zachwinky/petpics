-- Print Shop Migration
-- Adds tables for print products, orders, order items, and studio portraits

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_print_products_type ON print_products(product_type);
CREATE INDEX IF NOT EXISTS idx_print_products_active ON print_products(active);
CREATE INDEX IF NOT EXISTS idx_print_orders_user_id ON print_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_status ON print_orders(status);
CREATE INDEX IF NOT EXISTS idx_print_orders_stripe ON print_orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_printful ON print_orders(printful_order_id);
CREATE INDEX IF NOT EXISTS idx_print_order_items_order ON print_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_studio_portraits_user ON studio_portraits(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_portraits_model ON studio_portraits(model_id);
