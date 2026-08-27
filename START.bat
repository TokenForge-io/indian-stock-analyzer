@echo off
echo Starting Indian Stock Analyzer...
cd /d "%~dp0server"
start "Stock Server" /MIN node src/index.js
timeout /t 4 /nobreak >nul
echo.
echo ✅ Server running at http://localhost:5000
echo Opening browser...
start http://localhost:5000
pause
