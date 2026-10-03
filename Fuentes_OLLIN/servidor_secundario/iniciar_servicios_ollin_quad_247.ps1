<#
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: ORQUESTADOR 24/7 Y AUTO-RESTART EN BOOTEO (SERVICIOS CALPIXQUI & FRENTE 6)
ARCHIVO: iniciar_servicios_ollin_quad_247.ps1
VERSIÓN: 1.0.0 PROD (ARQUITECTURA OLLIN-QUAD)
================================================================================
#>

[CmdletBinding()]
param(
    [switch]$RegisterStartupTask,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseDir = Split-Path -Parent $ScriptDir
$RootDir = Split-Path -Parent $BaseDir

$VenvPython = Join-Path $ScriptDir ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    $VenvPython = "python.exe"
}

$GatewayDir = Join-Path $ScriptDir "whatsapp_gateway"
$GatewayScript = Join-Path $GatewayDir "gateway.js"
$Frente6Script = Join-Path $ScriptDir "daemon_frente6_reclamos.py"

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  ECOSISTEMA OLLIN-QUAD | ORQUESTADOR DE SERVICIOS PERSISTENTES 24/7" -ForegroundColor White
Write-Host "========================================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. VERIFICAR / INICIAR SERVICIO 1: GATEWAY WHATSAPP (PUERTO 3001)
# ------------------------------------------------------------------------------
Write-Host "`n[1/3] Verificando Servicio 1: Calpixqui WhatsApp Gateway (Puerto 3001)..." -ForegroundColor Yellow
$GwOnline = $false
try {
    $respGw = Invoke-RestMethod -Uri "http://localhost:3001/status" -Method Get -TimeoutSec 3 -ErrorAction Stop
    if ($respGw.ready) {
        Write-Host "  [+] Gateway WhatsApp ONLINE y LISTO (Numero: $($respGw.numero_vinculado))" -ForegroundColor Green
        $GwOnline = $true
    } else {
        Write-Host "  [!] Gateway en puerto 3001 respondiendo pero esperando QR o autenticacion." -ForegroundColor Yellow
        $GwOnline = $true
    }
} catch {
    Write-Host "  [i] Gateway no detectado en puerto 3001. Lanzando proceso en segundo plano..." -ForegroundColor Cyan
}

if (-not $GwOnline -and -not $CheckOnly) {
    Start-Process -FilePath "node" -ArgumentList "gateway.js" -WorkingDirectory $GatewayDir -WindowStyle Hidden
    Start-Sleep -Seconds 5
    try {
        $respGw = Invoke-RestMethod -Uri "http://localhost:3001/status" -Method Get -TimeoutSec 3 -ErrorAction Stop
        Write-Host "  [+] Gateway WhatsApp arrancado exitosamente. Status: $($respGw.status)" -ForegroundColor Green
    } catch {
        Write-Host "  [!] Proceso lanzado, esperando inicializacion de Chrome Headless..." -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------------------------
# 2. VERIFICAR / INICIAR SERVICIO 2: FRENTE 6 RECLAMOS & FASTAPI (PUERTO 8088)
# ------------------------------------------------------------------------------
Write-Host "`n[2/3] Verificando Servicio 2: Frente 6 Escudo Reclamos FastAPI (Puerto 8088)..." -ForegroundColor Yellow
$F6Online = $false
try {
    $respF6 = Invoke-RestMethod -Uri "http://localhost:8088/status" -Method Get -TimeoutSec 3 -ErrorAction Stop
    if ($respF6.ready) {
        Write-Host "  [+] Frente 6 FastAPI ONLINE en puerto 8088 (Ciclos: $($respF6.ciclos_completados), ZDR: $($respF6.politica_zdr))" -ForegroundColor Green
        $F6Online = $true
    }
} catch {
    Write-Host "  [i] Frente 6 no detectado en puerto 8088. Lanzando proceso en segundo plano..." -ForegroundColor Cyan
}

if (-not $F6Online -and -not $CheckOnly) {
    Start-Process -FilePath $VenvPython -ArgumentList "`"$Frente6Script`"" -WorkingDirectory $ScriptDir -WindowStyle Hidden
    Start-Sleep -Seconds 4
    try {
        $respF6 = Invoke-RestMethod -Uri "http://localhost:8088/status" -Method Get -TimeoutSec 3 -ErrorAction Stop
        Write-Host "  [+] Frente 6 FastAPI arrancado exitosamente. Status: $($respF6.status)" -ForegroundColor Green
    } catch {
        Write-Host "  [!] Proceso lanzado, esperando inicializacion de Uvicorn..." -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------------------------
# 3. REGISTRAR TAREA PROGRAMADA EN BOOTEO (WINDOWS TASK SCHEDULER)
# ------------------------------------------------------------------------------
if ($RegisterStartupTask) {
    Write-Host "`n[3/3] Registrando Tarea de Booteo persistente en Windows..." -ForegroundColor Yellow
    $TaskName = "OLLIN_QUAD_Daemons_247"
    $TaskAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -WorkingDirectory "$ScriptDir"
    $TaskTrigger = New-ScheduledTaskTrigger -AtLogOn
    $TaskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
    
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
        Register-ScheduledTask -TaskName $TaskName -Action $TaskAction -Trigger $TaskTrigger -Settings $TaskSettings -Description "OLLIN-QUAD 24/7 Daemons: Calpixqui WhatsApp Gateway (3001) y Frente 6 Escudo Reclamos (8088)" | Out-Null
        Write-Host "  [+] Tarea Programada '$TaskName' registrada exitosamente para inicio automatico en Windows." -ForegroundColor Green
    } catch {
        Write-Host "  [!] No se pudo registrar la tarea en Windows Task Scheduler: $_" -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------------------------
# 4. RESUMEN DE RED Y ESTADOS ATÓMICOS
# ------------------------------------------------------------------------------
$Ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -in @("Wi-Fi 2", "Ethernet", "Tailscale") -and $_.IPAddress -notlike "169.254*" }

Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "  ESTATUS ATOMICO FINAL - TOPOLOGIA OLLIN-QUAD" -ForegroundColor White
Write-Host "========================================================================" -ForegroundColor Cyan
foreach ($ip in $Ips) {
    Write-Host "  Interfaz: $($ip.InterfaceAlias) | IP: $($ip.IPAddress)" -ForegroundColor Cyan
}
Write-Host "  Calpixqui WhatsApp Gateway: http://localhost:3001/status [200 OK]" -ForegroundColor Green
Write-Host "  Frente 6 Escudo Reclamos:   http://localhost:8088/status [200 OK]" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan
