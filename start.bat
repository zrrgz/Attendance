@echo off
cd /d "%~dp0"
start cmd /c npm start
timeout /t 2 > nul
start http://localhost:3000
