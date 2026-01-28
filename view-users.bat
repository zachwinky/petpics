@echo off
REM Shows all users and their credit balances

set DATABASE_URL=postgres://4fa4f9faaa73cf6a36297e07c3d7b0ebdb9d6dedbaedfb979e00cc09b910b41f:sk_Ja2wwWvIaMaF9rblODQGv@db.prisma.io:5432/postgres?sslmode=require

npx tsx scripts/view-users.ts
