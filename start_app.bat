@echo off
setlocal ENABLEDELAYEDEXPANSION
title Maison Aria - Store OS Launcher
color 0F
cd /d "%~dp0"

echo ============================================================
echo   MAISON ARIA - Store OS Launcher
echo   folder: %CD%
echo ============================================================
echo.

REM 1) Node.js check
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo         Install Node.js LTS from https://nodejs.org/  ^(then reopen this file^)
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODEV=%%v
echo [OK] Node.js detected: %NODEV%

REM 2) npm check
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not available. Reinstall Node.js LTS.
  echo.
  pause
  exit /b 1
)

REM 3) server.js check
if not exist "server.js" (
  echo [ERROR] server.js not found in this folder.
  echo         Make sure you unzipped the package and are running this file inside the app folder.
  echo.
  pause
  exit /b 1
)

REM 4) node_modules check + auto install
if not exist "node_modules" (
  echo [INFO] node_modules not found. Installing dependencies... ^(first run only^)
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed. Check your internet connection and try again.
    echo.
    pause
    exit /b 1
  )
) else (
  echo [OK] node_modules found.
)

REM 5) Start server
echo.
echo [RUN] Starting Maison Aria Store OS ...
echo       Open your browser:  http://localhost:3000
echo       ^(Press Ctrl+C in this window to stop the server^)
echo ------------------------------------------------------------
echo.
call npm start

echo.
echo ============================================================
echo Server exited. Press any key to close this window.
echo ============================================================
pause >nul
endlocal
