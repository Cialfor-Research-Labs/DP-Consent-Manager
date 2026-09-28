@echo off
rem ==============================================================================
rem Data Principal Consent Manager — Windows Application Launcher (Batch)
rem ==============================================================================
setlocal enabledelayedexpansion

cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel% neq 0 (
    where python3 >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] Python is required but not found in PATH.
        echo Please install Python 3.9+ from https://www.python.org/downloads/
        pause
        exit /b 1
    )
    set "PYTHON_CMD=python3"
) else (
    set "PYTHON_CMD=python"
)

%PYTHON_CMD% start.py %*
if %errorlevel% neq 0 (
    echo.
    echo Application exited with error code %errorlevel%.
    pause
)
