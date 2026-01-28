-- Add pending_trainings table to track in-progress model trainings
-- Run this against your Postgres database

CREATE TABLE IF NOT EXISTS pending_trainings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fal_request_id VARCHAR(255) NOT NULL,
  trigger_word VARCHAR(50) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  images_count INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'training',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Index for looking up trainings by user (dashboard view)
CREATE INDEX IF NOT EXISTS idx_pending_trainings_user ON pending_trainings(user_id);

-- Index for looking up training by FAL request ID (status checks)
CREATE INDEX IF NOT EXISTS idx_pending_trainings_request ON pending_trainings(fal_request_id);

-- Index for finding active trainings
CREATE INDEX IF NOT EXISTS idx_pending_trainings_status ON pending_trainings(status);
