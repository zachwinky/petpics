-- Video generations table
-- Stores video generation requests and their results

CREATE TABLE IF NOT EXISTS video_generations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
  source_image_url TEXT NOT NULL,
  motion_prompt TEXT NOT NULL,
  fal_request_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  video_url TEXT,
  error_message TEXT,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_generations_user_id ON video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_model_id ON video_generations(model_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_status ON video_generations(status);
CREATE INDEX IF NOT EXISTS idx_video_generations_fal_request_id ON video_generations(fal_request_id);
