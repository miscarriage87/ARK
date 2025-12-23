@echo off
cls
echo.
echo ========================================
echo   ARK DIGITALER KALENDER - EINFACHER START
echo ========================================
echo.
echo Starte ARK Server (Backend + Frontend)...
echo.

REM Change to the backend directory
cd /d "%~dp0backend-node"

REM Check if we're in the right directory
if not exist "server.js" (
    echo FEHLER: server.js nicht gefunden!
    echo Aktuelles Verzeichnis: %CD%
    echo Stelle sicher, dass das Skript aus dem tools/kiro Verzeichnis ausgeführt wird.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installiere Abhängigkeiten...
    npm install
    if errorlevel 1 (
        echo FEHLER: npm install fehlgeschlagen!
        pause
        exit /b 1
    )
)

REM Start the server
start "ARK Server" cmd /k "node server.js"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   ARK LÄUFT JETZT!
echo ========================================
echo.
echo Vollständige App: http://localhost:8000/app
echo API: http://localhost:8000
echo.
echo Öffne Anwendung...
timeout /t 2 /nobreak >nul

start http://localhost:8000/app

echo.
echo Anwendung geöffnet!
echo Schließe das Server-Fenster zum Beenden.
echo.
pause