-- Add notes field to models table
ALTER TABLE models
  ADD COLUMN IF NOT EXISTS notes TEXT;
