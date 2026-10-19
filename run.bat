@echo off
title Velune Desktop Music Player
cd /d "%~dp0"

echo ========================================================
echo   Launching Velune Desktop (Rust + Tauri v2 + React)
echo ========================================================

npm run tauri dev
