@echo off
title Pushing D.I. Khan Care to GitHub
color 0A

echo =========================================================================
echo    D.I. KHAN CARE - PUSH TO GITHUB
echo =========================================================================
echo.
echo Pushing committed code to https://github.com/916subhan-source/D.-I.-Khan-Care.git ...
echo.

cd /d "%~dp0"
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ---------------------------------------------------------------------
    echo If GitHub asks to sign in, please complete the browser login prompt.
    echo ---------------------------------------------------------------------
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo =========================================================================
echo  SUCCESS! All code is pushed to your GitHub repository!
echo =========================================================================
echo.
pause
