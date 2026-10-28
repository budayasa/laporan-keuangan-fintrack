@echo off
title Deploy FinTrack Pro ke Vercel.app
color 0A
echo ============================================================================
echo   FINTRACK PRO - DEPLOY OTOMATIS KE VERCEL.APP (GRATIS)
echo ============================================================================
echo.

where npx >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Node.js belum terdeteksi di komputer ini.
    echo [INFO] Menginstal Node.js LTS secara otomatis menggunakan Winget...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    echo.
    echo [PENTING] Setelah instalasi Node.js selesai, tutup jendela ini lalu
    echo klik 2x lagi file "deploy-ke-vercel.bat" ini untuk langsung deploy!
    pause
    exit /b
)

echo [INFO] Menjalankan Vercel CLI untuk meng-online-kan aplikasi ke vercel.app...
echo [TIPS] Ikuti petunjuk login di browser jika diminta oleh Vercel.
echo.
cd /d "%~dp0"
npx vercel --prod

echo.
echo ============================================================================
echo   SELESAI! Link vercel.app Anda sudah siap digunakan di internet.
echo ============================================================================
pause
