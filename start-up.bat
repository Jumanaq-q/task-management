echo off
start /min "Task App - Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\activate && uvicorn app.main:app"
start /min "Task App - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 6 /nobreak >nul
start http://localhost:5173
exit