@echo off
REM Add pending_trainings table to database

echo Adding pending_trainings table to database...
echo.
cmd /c "set DATABASE_URL=postgres://4fa4f9faaa73cf6a36297e07c3d7b0ebdb9d6dedbaedfb979e00cc09b910b41f:sk_Ja2wwWvIaMaF9rblODQGv@db.prisma.io:5432/postgres?sslmode=require && npx tsx -e \"import { Pool } from 'pg'; const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); async function run() { await pool.query(\`CREATE TABLE IF NOT EXISTS pending_trainings (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, fal_request_id VARCHAR(255) NOT NULL, trigger_word VARCHAR(50) NOT NULL, model_name VARCHAR(255) NOT NULL, images_count INTEGER NOT NULL, status VARCHAR(20) DEFAULT 'training', error_message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMP)\`); console.log('Created pending_trainings table'); await pool.query('CREATE INDEX IF NOT EXISTS idx_pending_trainings_user ON pending_trainings(user_id)'); await pool.query('CREATE INDEX IF NOT EXISTS idx_pending_trainings_request ON pending_trainings(fal_request_id)'); await pool.query('CREATE INDEX IF NOT EXISTS idx_pending_trainings_status ON pending_trainings(status)'); console.log('Created indexes'); await pool.end(); } run().catch(err => { console.error('Error:', err); pool.end(); })\""
echo.
echo Done!
pause
