@echo off
echo === Testing Attendance API Endpoints ===
echo.

if "%1"=="" (
    echo Error: JWT token is required.
    echo Usage: test-attendance-api.bat YOUR_JWT_TOKEN
    exit /b 1
)

python test_attendance_api.py %1
echo.
echo === Test Complete ===
echo.
pause
