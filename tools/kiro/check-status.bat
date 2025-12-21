@echo off
echo ========================================
echo ARK Digital Calendar - Status Check
echo ========================================
echo.

echo Checking backend server (port 8000)...
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Backend server is running at http://localhost:8000
) else (
    echo ❌ Backend server is not responding
)

echo.
echo Checking frontend server (port 3000)...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Frontend server is running at http://localhost:3000
) else (
    echo ❌ Frontend server is not responding
)

echo.
echo ========================================
echo Quick Links:
echo ========================================
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
pause