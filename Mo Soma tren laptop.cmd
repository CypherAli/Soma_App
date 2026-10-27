@echo off
cd /d "%~dp0"
call npm run desktop:preview
if errorlevel 1 pause
