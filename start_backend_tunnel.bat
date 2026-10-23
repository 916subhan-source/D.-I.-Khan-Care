@echo off
title D.I. Khan Doctor Appointment System - Backend Tunnel
echo =========================================================================
echo   D.I. Khan Care - Doctor Appointment System
echo   Starting Local FastAPI Backend ^& Fixed HTTPS Tunnel (dikhan-care-api.loca.lt)
echo =========================================================================
echo.

:: 1. Start FastAPI Backend Server
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
cd /d "%~dp0backend"
start "FastAPI Backend Server (Port 8000)" cmd /k "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

:: 2. Start Fixed Public HTTPS Tunnel
echo [2/2] Starting Fixed Public HTTPS Tunnel: https://dikhan-care-api.loca.lt ...
echo.
cd /d "%~dp0"
npx -y localtunnel --port 8000 --subdomain dikhan-care-api
pause
