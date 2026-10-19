@echo off
cd /d "%~dp0"
call npm run build
cargo build --release --manifest-path "src-tauri\Cargo.toml"
if exist "src-tauri\target\release\desktop-app.exe" copy /y "src-tauri\target\release\desktop-app.exe" "Velune.exe"
