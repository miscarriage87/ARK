@echo off
REM ARK Digital Calendar - Development Setup Script (Windows)
REM This script sets up the development environment for both backend and frontend

echo 🚀 Setting up ARK Digital Calendar development environment...

REM Check if we're in the right directory
if not exist "README.md" (
    echo ❌ Please run this script from the tools/kiro directory
    exit /b 1
)

REM Backend setup
echo 📦 Setting up Python backend...
cd backend

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install Python dependencies
echo Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please update the .env file with your actual configuration values
)

REM Initialize database
echo Initializing database...
alembic upgrade head

echo ✅ Backend setup complete!

REM Frontend setup
cd ..\frontend
echo 📦 Setting up frontend...

REM Check if npm is available
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Installing Node.js dependencies...
    npm install
    
    REM Build CSS and JS
    echo Building frontend assets...
    npm run build
    
    echo ✅ Frontend setup complete!
) else (
    echo ⚠️  npm not found. Please install Node.js to set up the frontend.
    echo    You can download it from: https://nodejs.org/
)

cd ..

echo.
echo 🎉 ARK Digital Calendar setup complete!
echo.
echo To start development:
echo   Backend:  cd backend ^&^& venv\Scripts\activate ^&^& uvicorn app.main:app --reload
echo   Frontend: cd frontend ^&^& npm run dev
echo.
echo 📚 API Documentation will be available at: http://localhost:8000/docs
echo 🌐 Frontend will be available at: http://localhost:3000
echo.
echo Don't forget to:
echo   1. Update backend/.env with your OpenAI API key
echo   2. Configure any other environment variables as needed

pause