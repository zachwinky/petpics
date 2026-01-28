-- Add preview_image_url field to models table
ALTER TABLE models ADD COLUMN IF NOT EXISTS preview_image_url TEXT;

-- Verify the change
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'models'
AND column_name = 'preview_image_url';
