-- One-time migration to link existing generations to their models
-- This script will:
-- 1. For users with only one model, link all their generations to that model
-- 2. For users with multiple models, try to match by trigger word in prompt
-- 3. As fallback, link to user's first model

-- Step 1: Update generations where user has only one model
UPDATE generations g
SET model_id = m.id
FROM (
  SELECT m1.id, m1.user_id
  FROM models m1
  WHERE (
    SELECT COUNT(*)
    FROM models m2
    WHERE m2.user_id = m1.user_id
  ) = 1
) m
WHERE g.user_id = m.user_id
  AND g.model_id IS NULL;

-- Step 2: For users with multiple models, try to match by trigger word
-- This is more complex and might need to be done programmatically
-- For now, link remaining generations to the first model for each user
UPDATE generations g
SET model_id = m.id
FROM (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM models
  ORDER BY user_id, created_at ASC
) m
WHERE g.user_id = m.user_id
  AND g.model_id IS NULL;

-- Verify the results
SELECT
  COUNT(*) FILTER (WHERE model_id IS NULL) as unlinked_count,
  COUNT(*) FILTER (WHERE model_id IS NOT NULL) as linked_count,
  COUNT(*) as total_count
FROM generations;
