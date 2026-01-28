-- Add reroll_used field to generations table
-- This tracks whether a user has used their free remake for each generation batch

ALTER TABLE generations ADD COLUMN IF NOT EXISTS reroll_used BOOLEAN DEFAULT FALSE;

-- Add row_prompts field to track the prompt used for each row of 4 images
ALTER TABLE generations ADD COLUMN IF NOT EXISTS row_prompts TEXT[];
