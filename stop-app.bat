@echo off
taskkill /FI "WINDOWTITLE eq Task App - Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Task App - Frontend*" /T /F >nul 2>&1
echo Task Management app stopped.
timeout /t 2 >nul