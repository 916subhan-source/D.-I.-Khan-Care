@echo off
title D.I. Khan Doctor Appointment System - Backend Tunnel
echo =========================================================================
echo   D.I. Khan Care - Doctor Appointment System
echo   Starting Local FastAPI Backend ^& Secure HTTPS Tunnel (No Card Needed)
echo =========================================================================
echo.

:: 1. Start FastAPI Backend Server
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
cd /d "%~dp0backend"
start "FastAPI Backend Server (Port 8000)" cmd /k "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

:: 2. Start Secure Public HTTPS Tunnel
echo [2/2] Starting Public Secure HTTPS Tunnel...
echo.
echo =========================================================================
echo   Your tunnel URL will appear below (look for the https://...lhr.life URL)
echo   Keep this window open while using the live website!
echo =========================================================================
echo.

cd /d "%~dp0"
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:127.0.0.1:8000 nokey@localhost.run
pause
