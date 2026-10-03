@echo off
setlocal EnableDelayedExpansion
title CALPIXQUI — Disparo Directo WhatsApp (Chrome DOM / CDP)
chcp 65001 >nul

echo.
echo ========================================================================
echo   🏛️ CALPIXQUI ARAUTO EXPRESS — DESPACHO DE WHATSAPP VÍA CHROME DOM
echo   Ecosistema OLLIN  /  Mesa de Control 24/7
echo   Sin PyAutoGUI  |  Sin Teclado Físico  |  Selector DOM Nativo (CDP)
echo ========================================================================
echo.

cd /d "%~dp0"

:: 1. Verificar si Google Chrome está abierto actualmente
tasklist /fi "imagename eq chrome.exe" 2>nul | find /i "chrome.exe" >nul
if %errorLevel% equ 0 (
    echo   [!] ATENCIÓN: Google Chrome está abierto actualmente en esta máquina.
    echo   Para permitir que Calpixqui cargue tu sesión de 'sidharta.santiago@arauto.express'
    echo   sin colisión de perfiles, por favor CIERRA GOOGLE CHROME ahora.
    echo.
    echo   Presiona cualquier tecla UNA VEZ QUE HAYAS CERRADO CHROME...
    pause >nul
)

:: 2. Localizar Python (.venv local o Python del sistema)
set "PY_EXE="
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0.venv\Scripts\python.exe"
) else (
    where python >nul 2>&1
    if %errorLevel% equ 0 (
        set "PY_EXE=python"
    )
)

if "%PY_EXE%"=="" (
    echo   [ERROR] No se encontró Python en el sistema ni en .venv.
    pause
    exit /b 1
)

echo   [✔] Python detectado: %PY_EXE%
echo   [i] Iniciando despacho directo a WhatsApp vía Chrome CDP...
echo.

"%PY_EXE%" "%~dp0chrome_cdp_whatsapp.py"

echo.
echo ========================================================================
echo   Proceso de despacho finalizado.
echo ========================================================================
pause
