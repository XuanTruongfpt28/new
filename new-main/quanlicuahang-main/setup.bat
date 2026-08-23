@echo off
title DONG GOI VA CAI DAT HE THONG QUAN LY
echo ===================================================
echo   DANG TU DONG CAI DAT THU VIEN CHO MAY MOI...
echo ===================================================

echo.
echo [1/2] Dang cai dat Backend...
cd backend
call npm install
call npx prisma generate
cd ..

echo.
echo [2/2] Dang cai dat Frontend...
cd cua-hang-frontend
call npm install
cd ..

echo.
echo ===================================================
echo   CAI DAT HOAN TAT! DONG CUA SO NAY DE KET THUC.
echo ===================================================
pause