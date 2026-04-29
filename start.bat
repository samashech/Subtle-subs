@echo off
REM Start script for Windows
cd /d "%~dp0"

IF NOT EXIST venv (
    echo Creating virtual environment and installing dependencies...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) ELSE (
    call venv\Scripts\activate.bat
)

echo Starting server...
python server.py
pause
