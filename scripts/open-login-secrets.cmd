@echo off
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0login-and-set-secrets.ps1"
