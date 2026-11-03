@echo off
echo Starting Wholesale Management System...

REM Check if node_modules exists in root
if not exist "node_modules\" (
    echo Installing root dependencies...
    call npm install
)

REM Check if node_modules exists in backend
if not exist "backend\node_modules\" (
    echo Installing backend dependencies...
    call npm install --prefix backend
)

REM Check if node_modules exists in frontend
if not exist "frontend\node_modules\" (
    echo Installing frontend dependencies...
    call npm install --prefix frontend
)

echo.
echo Starting Backend and Frontend...
echo.
npm start
pause
