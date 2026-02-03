@echo off
echo ==========================================
echo      AUTO GITHUB PUSH - MAP MANAGER
echo ==========================================
echo.

:: 1. Cek status file apa saja yang berubah
echo [STATUS PERUBAHAN]
git status --short
echo.

:: 2. Meminta input pesan commit (WAJIB)
:input_msg
set /p CommitMessage="Masukan pesan commit: "
if "%CommitMessage%"=="" goto input_msg

:: 3. Eksekusi perintah Git
echo.
echo [1/3] Menambahkan file...
git add .

echo [2/3] Menyimpan commit...
git commit -m "%CommitMessage%"

echo [3/3] Mengirim ke GitHub (Pushing)...
git push origin main

echo.
echo ==========================================
echo           SUKSES TERKIRIM!
echo ==========================================
pause