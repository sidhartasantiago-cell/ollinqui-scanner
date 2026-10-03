@echo off
:: ============================================================================
:: 🏛️ ECOSISTEMA OLLIN - BLINDAJE DE ENERGÍA Y RED 24/7 (PC SECUNDARIA)
:: Convierte el equipo en Servidor Dedicado Ininterrumpido
:: ============================================================================
TITLE OLLIN-QUAD - BLINDAJE ENERGIA Y RED 24/7

:: Comprobar privilegios de Administrador
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [!] Solicitando elevacion de privilegios de Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ========================================================================
echo   🏛️ ECOSISTEMA OLLIN ^| BLINDAJE DE ENERGIA Y RED 24/7
echo ========================================================================

echo [1/4] Desactivando Hibernacion...
powercfg -h off

echo [2/4] Desactivando Suspension y Apagado de Pantalla en Corriente...
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /change disk-timeout-ac 0

echo [3/4] Desactivando Energy Efficient Ethernet y Ahorro en Tarjetas de Red...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Get-NetAdapter | ForEach-Object { " ^
    "    Set-NetAdapterAdvancedProperty -Name $_.Name -DisplayName 'Energy Efficient Ethernet' -DisplayValue 'Off' -ErrorAction SilentlyContinue; " ^
    "    Set-NetAdapterAdvancedProperty -Name $_.Name -DisplayName 'PCI Express Link Power Saving' -DisplayValue 'Disabled' -ErrorAction SilentlyContinue; " ^
    "    Set-NetAdapterAdvancedProperty -Name $_.Name -DisplayName 'Ultra Low Power Mode' -DisplayValue 'Disabled' -ErrorAction SilentlyContinue; " ^
    "    Set-NetAdapterAdvancedProperty -Name $_.Name -DisplayName 'System Idle Power Saver' -DisplayValue 'Disabled' -ErrorAction SilentlyContinue; " ^
    "}; Write-Host 'Propiedades avanzadas de red blindadas con exito.' -ForegroundColor Green"

echo [4/4] Blindando KeepAlive TCP/IP en Registro de Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'KeepAliveTime' -Value 30000 -Type DWord -Force; " ^
    "Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'KeepAliveInterval' -Value 1000 -Type DWord -Force; " ^
    "Write-Host 'Parametros TCP/IP KeepAlive fijados a 30s.' -ForegroundColor Green"

echo ========================================================================
echo  [✔] BLINDAJE DE ENERGIA Y RED COMPLETADO EXITOSAMENTE
echo ========================================================================
timeout /t 5
