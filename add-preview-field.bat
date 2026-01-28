@echo off
REM Add preview_image_url field to models table

echo Adding preview_image_url field to models table...
echo.
cmd /c "set DATABASE_URL=postgres://4fa4f9faaa73cf6a36297e07c3d7b0ebdb9d6dedbaedfb979e00cc09b910b41f:sk_Ja2wwWvIaMaF9rblODQGv@db.prisma.io:5432/postgres?sslmode=require && npx tsx -e \"import { Pool } from 'pg'; const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); pool.query('ALTER TABLE models ADD COLUMN IF NOT EXISTS preview_image_url TEXT').then(() => { console.log('Field added successfully!'); pool.end(); }).catch(err => { console.error('Error:', err); pool.end(); })\""
echo.
echo Done!
pause
