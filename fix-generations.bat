@echo off
REM Fixes existing generations by linking them to their models
REM This is a one-time migration

echo Running migration to link generations to models...
echo.
cmd /c "set DATABASE_URL=postgres://4fa4f9faaa73cf6a36297e07c3d7b0ebdb9d6dedbaedfb979e00cc09b910b41f:sk_Ja2wwWvIaMaF9rblODQGv@db.prisma.io:5432/postgres?sslmode=require && npx tsx scripts/fix-generation-model-links.ts"
echo.
echo Done! Check the output above for results.
pause
