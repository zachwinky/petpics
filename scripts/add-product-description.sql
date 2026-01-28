-- Add product_description column to models table
-- This stores AI-generated descriptions of products for better text rendering in generations

ALTER TABLE models ADD COLUMN IF NOT EXISTS product_description TEXT;
