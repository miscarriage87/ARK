@echo off
echo ========================================
echo Starting ARK Digital Calendar
echo ========================================
echo.

REM Start backend server in a new window
echo Starting backend server on http://localhost:8000...
start "ARK Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server in a new window
echo Starting frontend server on http://localhost:3000...
start "ARK Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo ARK Digital Calendar is starting!
echo ========================================
echo.
echo Backend API: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo.
echo Press any key to open the application in your browser...
pause >nul

REM Open the application in default browser
start http://localhost:3000

echo.
echo Application opened in browser!
echo Close the terminal windows to stop the servers.
