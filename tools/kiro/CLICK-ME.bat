@echo off
cls
echo.
echo  ╔══════════════════════════════════════╗
echo  ║        ARK DIGITAL CALENDAR          ║
echo  ║              LAUNCHER                ║
echo  ╚══════════════════════════════════════╝
echo.
echo  Choose your option:
echo.
echo  [1] Open Demo (Works 100%% - No setup needed)
echo  [2] Open Full App (Requires server)
echo  [3] Exit
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Opening ARK Demo...
    start "" "%CD%\ARK-DEMO.html"
    echo Demo opened in your browser!
    goto end
)

if "%choice%"=="2" (
    echo.
    echo Opening Full App...
    start "" "%CD%\frontend\public\index.html"
    echo Full app opened in your browser!
    echo Note: Some features need the backend server running.
    goto end
)

if "%choice%"=="3" (
    echo.
    echo Goodbye!
    goto end
)

echo Invalid choice. Please try again.
pause
goto start

:end
echo.
echo Press any key to exit...
pause >nul