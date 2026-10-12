@echo off
setlocal EnableDelayedExpansion
title CALPIXQUI — Gateway WhatsApp Headless (puerto 3001)
chcp 65001 >nul

echo.
echo ========================================================================
echo   🏛️ CALPIXQUI ARAUTO EXPRESS — GATEWAY WHATSAPP HEADLESS
echo   Ecosistema OLLIN  /  Agente Hermes 24/7
echo   Puerto: 3001  |  Modo: Headless (sin GUI)
echo ========================================================================
echo.
echo   1. Si es la PRIMERA VEZ: escanea el QR con tu teléfono.
echo   2. Las siguientes veces arranca en silencio (sesion guardada).
echo ========================================================================
echo.

cd /d "%~dp0"

:: Verificar node
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo   [ERROR] Node.js no encontrado. Instala Node.js 18+.
    pause
    exit /b 1
)

:: Instalar dependencias si no existen
if not exist "node_modules" (
    echo   [+] Instalando dependencias npm...
    npm install
    if %errorLevel% neq 0 (
        echo   [ERROR] Fallo npm install. Revisa la conexión a internet.
        pause
        exit /b 1
    )
    echo   [ok] Dependencias instaladas.
    echo.
)

echo   [ok] Iniciando gateway...
node gateway.js
pause
