@echo off
echo ========================================
echo Starting ARK Digital Calendar (Simple)
echo ========================================
echo.

REM Create a simple Python HTTP server for the frontend
echo Starting frontend server on http://localhost:8080...
start "ARK Frontend" cmd /k "cd frontend/public && python -m http.server 8080"

echo.
echo Frontend is starting at: http://localhost:8080
echo.
echo Note: This runs the frontend only with static content.
echo For full functionality including AI quotes, you'll need to:
echo 1. Fix the backend dependencies
echo 2. Start the backend server separately
echo.
echo Press any key to open the frontend...
pause >nul

start http://localhost:8080

echo.
echo Frontend opened! Close the terminal window to stop the server.