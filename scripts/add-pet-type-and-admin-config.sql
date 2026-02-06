-- Migration: Add pet_type to models and admin_config table
-- Date: 2026-02-06
-- Features: Cat vs Dog detection, Admin sample prompt configuration

-- Add pet_type column to models table
ALTER TABLE models ADD COLUMN IF NOT EXISTS pet_type VARCHAR(10) DEFAULT 'dog';

-- Create admin_config table for storing app-wide settings
CREATE TABLE IF NOT EXISTS admin_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize sample prompt configuration (used for training completion samples)
INSERT INTO admin_config (key, value) VALUES
  ('sample_prompt_ids', '["studio-white", "park-scene"]')
ON CONFLICT (key) DO NOTHING;
