@echo off
echo ==========================================
echo Starting DigiWork Management System
echo ==========================================

echo.
echo Starting Backend Server...
start cmd /k "cd server && npm install && npm run dev"

echo.
echo Starting Frontend Website...
start cmd /k "cd client && npm install && npm run dev"

echo.
echo Both servers are starting up in new windows!
echo Please check the new black terminal windows for the local links.
pause
