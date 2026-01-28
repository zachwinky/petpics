@echo off
REM Opens Prisma Studio to view and edit database

set DATABASE_URL=postgres://4fa4f9faaa73cf6a36297e07c3d7b0ebdb9d6dedbaedfb979e00cc09b910b41f:sk_Ja2wwWvIaMaF9rblODQGv@db.prisma.io:5432/postgres?sslmode=require

echo Opening Prisma Studio...
echo You can view and edit your database at http://localhost:5555
npx prisma studio
