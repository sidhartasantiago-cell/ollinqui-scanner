<#
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: BLINDAJE DE ENERGÍA Y RED 24/7 (PC SECUNDARIA / SERVIDOR DEDICADO)
ARCHIVO: blindaje_energia_red_247.ps1
VERSIÓN: 1.0.0 PROD
================================================================================
#>

[CmdletBinding()]
param()

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
    Write-Host "Re-ejecutando con permisos de administrador..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  🏛️  ECOSISTEMA OLLIN | BLINDAJE ENERGIA Y RED 24/7" -ForegroundColor White
Write-Host "========================================================================" -ForegroundColor Cyan

# 1. Configuración de Energía (powercfg)
Write-Host "`n[1/3] Configurando Power Management a Servidor Dedicado..." -ForegroundColor Yellow
powercfg -h off
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /change disk-timeout-ac 0
Write-Host "  [✔] Hibernación desactivada y timeouts en corriente fijados en 0 (Nunca suspender)." -ForegroundColor Green

# 2. Configuración de Adaptadores de Red
Write-Host "`n[2/3] Blindando Adaptadores de Red (Energy Efficient Ethernet & Power Saving)..." -ForegroundColor Yellow
$Adapters = Get-NetAdapter -ErrorAction SilentlyContinue
foreach ($adapter in $Adapters) {
    Set-NetAdapterAdvancedProperty -Name $adapter.Name -DisplayName "Energy Efficient Ethernet" -DisplayValue "Off" -ErrorAction SilentlyContinue
    Set-NetAdapterAdvancedProperty -Name $adapter.Name -DisplayName "PCI Express Link Power Saving" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
    Set-NetAdapterAdvancedProperty -Name $adapter.Name -DisplayName "Ultra Low Power Mode" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
    Set-NetAdapterAdvancedProperty -Name $adapter.Name -DisplayName "System Idle Power Saver" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
    Write-Host "  [✔] Tarjeta '$($adapter.Name)' configurada sin ahorro de energía." -ForegroundColor Green
}

# 3. TCP/IP KeepAlive para WebSockets de Calpixqui
Write-Host "`n[3/3] Optimizando KeepAlive TCP/IP (Evitar caídas de WebSocket)..." -ForegroundColor Yellow
$TcpipPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
Set-ItemProperty -Path $TcpipPath -Name "KeepAliveTime" -Value 30000 -Type DWord -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path $TcpipPath -Name "KeepAliveInterval" -Value 1000 -Type DWord -Force -ErrorAction SilentlyContinue
Write-Host "  [✔] KeepAliveTime = 30000ms (30s), KeepAliveInterval = 1000ms (1s)." -ForegroundColor Green

Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "  [✔] BLINDAJE 24/7 DE ENERGÍA Y RED CONCLUIDO CON ÉXITO" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan
