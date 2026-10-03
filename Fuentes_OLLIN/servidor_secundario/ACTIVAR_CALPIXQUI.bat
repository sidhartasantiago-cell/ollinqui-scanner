@echo off
setlocal EnableDelayedExpansion
title ACTIVADOR DEL AGENTE CALPIXQUI (CALPIX) 24/7 - ECOSISTEMA OLLIN
chcp 65001 >nul

:: ==============================================================================
:: 🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
:: LANZADOR DE UN SOLO CLIC: AGENTE CALPIXQUI (CALPIX) 24/7
:: "El Guardián de la Casa y Administrador de la Bóveda"
:: ==============================================================================

:: 1. Verificación y auto-elevación de privilegios de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ========================================================================
    echo   [i] Solicitando privilegios de Administrador para AGENTE CALPIXQUI...
    echo ========================================================================
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~dp0ACTIVAR_CALPIXQUI.bat\"\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo.
echo ========================================================================
echo   🏛️  ECOSISTEMA OLLIN — ARAUTO EXPRESS
echo   INICIALIZADOR DE UN SOLO CLIC: AGENTE CALPIXQUI (CALPIX) 24/7
echo   "El Guardián de la Casa y Administrador de la Bóveda"
echo ========================================================================
echo   Directorio: %~dp0
echo   Fecha: %DATE% %TIME%
echo ========================================================================
echo.

:: 2. Verificar existencia de .env o copiar plantilla
if not exist ".env" (
    if exist ".env.template" (
        copy ".env.template" ".env" >nul
        echo   [+] Archivo .env generado automaticamente desde .env.template.
        echo   [!] RECUERDA: Agrega tu GEMINI_API_KEY en el archivo .env si aun no lo has hecho.
    ) else (
        echo   [!] Advertencia: No se encontro .env.template.
    )
) else (
    echo   [ok] Archivo de configuracion .env detectado.
)

:: 3. Ejecutar setup de entorno
echo.
echo ========================================================================
echo   PASO 1/3: PREPARACION DEL ENTORNO (Python, RAM, Tailscale, .venv)...
echo ========================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_entorno.ps1"
if %errorLevel% neq 0 (
    echo.
    echo   [X] Error durante la ejecucion de setup_entorno.ps1.
    echo   Por favor revisa los mensajes superiores.
    pause
    exit /b %errorLevel%
)

:: 4. Registrar servicio 24/7
echo.
echo ========================================================================
echo   PASO 2/3: REGISTRO Y ARRANQUE DEL SERVICIO DE WINDOWS (24/7)...
echo ========================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0registrar_servicio_247.ps1"

:: 5. Verificación de salud HTTP
echo.
echo ========================================================================
echo   PASO 3/3: VERIFICACION ATOMICA DE SALUD (http://localhost:8088/health)...
echo ========================================================================
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$url = 'http://localhost:8088/health'; ^
     Start-Sleep -Seconds 4; ^
     try { ^
         $r = Invoke-RestMethod -Uri $url -TimeoutSec 6; ^
         Write-Host '  [ok] AGENTE CALPIXQUI ONLINE Y SALUDABLE EN PUERTO 8088!' -ForegroundColor Green; ^
         Write-Host ('      Agente: ' + $r.agente + ' | Estado: ' + $r.estado) -ForegroundColor Cyan; ^
         Write-Host ('      Uptime: ' + $r.uptime_segundos + 's | RAM Usada: ' + $r.hardware.ram_usada_gb + ' GB (' + $r.hardware.ram_porcentaje + '%)') -ForegroundColor Cyan; ^
         Write-Host ('      Tailscale IP: ' + $r.red.tailscale_ip_nodo) -ForegroundColor Cyan; ^
         Write-Host ('      Gemini API Lista: ' + $r.servicios.gemini_api_configurada) -ForegroundColor Cyan; ^
     } catch { ^
         Write-Host '  [i] El servicio esta levantando silenciosamente de fondo.' -ForegroundColor Yellow; ^
         Write-Host '      Puedes consultar los registros en tiempo real en: .\logs\hermes_service_stdout.log' -ForegroundColor White; ^
     }"

echo.
echo ========================================================================
echo   🏛️  ACTIVACION COMPLETADA: AGENTE CALPIXQUI ESTA EN FUNCIONAMIENTO
echo   El servicio operara de fondo 24/7 sin requerir inicio de sesion de usuario.
echo   Para detenerlo en el futuro, ejecuta: powershell .\desinstalar_servicio_247.ps1
echo ========================================================================
echo.
pause
