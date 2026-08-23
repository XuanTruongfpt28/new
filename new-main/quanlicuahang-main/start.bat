@echo off
title KHOI DONG HE THONG QUAN LY XE DIEN
echo ===================================================
echo   DANG KHOI DONG BACKEND, FRONTEND VA NGROK...
echo ===================================================

:: 1. Khoi dong Backend (Port 5000)
start "BACKEND SERVER" cmd /k "cd backend && npm run dev"

:: 2. Khoi dong Frontend (Port 5173)
start "FRONTEND WEB" cmd /k "cd cua-hang-frontend && npm run dev"

:: 3. Khoi dong Ngrok tu dong tao link moi
start "NGROK TUNNEL" cmd /k "ngrok http 5000"

echo.
echo ===================================================
echo   HE THONG DA KHOI DONG THANH CONG!
echo ===================================================

timeout /t 5
start http://localhost:5173