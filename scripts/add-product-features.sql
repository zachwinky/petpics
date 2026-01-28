-- Add product_features JSONB column to models table
-- This stores comprehensive product analysis including shape, colors, materials, text, and user corrections

ALTER TABLE models ADD COLUMN IF NOT EXISTS product_features JSONB;

-- Example structure:
-- {
--   "text": { "content": "BRAND on front, 50ml bottom", "source": "ai_analysis", "updated_at": "2024-01-01T00:00:00Z" },
--   "shape": { "content": "cylindrical bottle with rounded cap", "source": "reference_image", "updated_at": "..." },
--   "colors": { "content": "navy blue body, rose gold cap", "source": "user_feedback", "updated_at": "..." },
--   "materials": { "content": "frosted glass, brushed metal cap", "source": "ai_analysis", "updated_at": "..." },
--   "distinctive": { "content": "embossed logo, vertical ribbing", "source": "reference_image", "updated_at": "..." },
--   "user_corrections": "The cap is more rose gold than silver"
-- }
