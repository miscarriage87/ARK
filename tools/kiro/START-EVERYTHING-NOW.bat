@echo off
cls
echo.
echo ========================================
echo   ARK DIGITAL CALENDAR - FULL LAUNCH
echo ========================================
echo.
echo Starting backend server...
start "ARK Backend (Node.js)" cmd /k "cd backend-node && node server.js"

timeout /t 2 /nobreak >nul

echo Starting frontend server...
start "ARK Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   ARK IS NOW RUNNING!
echo ========================================
echo.
echo Backend API: http://localhost:8000
echo Frontend App: http://localhost:3000
echo.
echo Opening application in browser...
timeout /t 2 /nobreak >nul

start http://localhost:3000

echo.
echo ========================================
echo Application is running!
echo Close the terminal windows to stop.
echo ========================================
echo.
pause