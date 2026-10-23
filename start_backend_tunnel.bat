@echo off
title D.I. Khan Doctor Appointment System - Cloudflare Backend Tunnel
echo =========================================================================
echo   D.I. Khan Care - Doctor Appointment System
echo   Starting Local FastAPI Backend & Cloudflare Secure Tunnel
echo =========================================================================
echo.

cd /d "%~dp0backend"
start "FastAPI Backend Server (Port 8000)" cmd /k "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

cd /d "%~dp0"
echo Starting Cloudflare Tunnel (Stable HTTP/2 Protocol)...
.\cloudflared.exe tunnel --protocol http2 --url http://127.0.0.1:8000

