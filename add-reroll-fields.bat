@echo off
REM Add reroll_used and row_prompts fields to generations table

echo Adding reroll_used and row_prompts fields to generations table...
echo.
cmd /c "set DATABASE_URL=postgres://4fa4f9faaa73cf6a36297e07c3d7b0ebdb9d6dedbaedfb979e00cc09b910b41f:sk_Ja2wwWvIaMaF9rblODQGv@db.prisma.io:5432/postgres?sslmode=require && npx tsx -e \"import { Pool } from 'pg'; const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); async function run() { await pool.query('ALTER TABLE generations ADD COLUMN IF NOT EXISTS reroll_used BOOLEAN DEFAULT FALSE'); console.log('Added reroll_used column'); await pool.query('ALTER TABLE generations ADD COLUMN IF NOT EXISTS row_prompts TEXT[]'); console.log('Added row_prompts column'); await pool.end(); } run().catch(err => { console.error('Error:', err); pool.end(); })\""
echo.
echo Done!
pause
