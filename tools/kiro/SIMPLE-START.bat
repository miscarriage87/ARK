@echo off
cls
echo.
echo ========================================
echo   ARK DIGITAL CALENDAR - SIMPLE START
echo ========================================
echo.
echo Starting ARK server (backend + frontend)...
echo.

cd backend-node
start "ARK Server" cmd /k "node server.js"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   ARK IS NOW RUNNING!
echo ========================================
echo.
echo Full App: http://localhost:8000/app
echo API: http://localhost:8000
echo.
echo Opening application...
timeout /t 2 /nobreak >nul

start http://localhost:8000/app

echo.
echo Application opened!
echo Close the server window to stop.
echo.
pause