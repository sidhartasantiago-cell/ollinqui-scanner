<#
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: NODO SECUNDARIO DE AUTOMATIZACIÓN 24/7 (HERMES AGENT NODE)
ARCHIVO: desinstalar_servicio_247.ps1
PROPÓSITO:
Detener y desinstalar limpiamente el servicio de Windows o la Tarea Programada
del orquestador Hermes en la PC secundaria.
================================================================================
#>

[CmdletBinding()]
param (
    [string]$ServiceName = "CalpixquiWorker",
    [string]$TaskName = "OLLIN_Calpixqui_Worker_247"
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-OllinHeader {
    param([string]$Titulo)
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor DarkCyan
    Write-Host "  🏛️  ECOSISTEMA OLLIN | $Titulo" -ForegroundColor Cyan
    Write-Host "========================================================================" -ForegroundColor DarkCyan
}

function Write-OllinSuccess {
    param([string]$Mensaje)
    Write-Host "  [✔] $Mensaje" -ForegroundColor Green
}

function Write-OllinInfo {
    param([string]$Mensaje)
    Write-Host "  [ℹ] $Mensaje" -ForegroundColor White
}

Clear-Host
Write-OllinHeader "DESINSTALACIÓN DEL SERVICIO 24/7 (AGENTE CALPIXQUI)"

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
    Write-Host "  [✖] Requiere privilegios de Administrador para remover servicios de Windows." -ForegroundColor Red
    exit 1
}

# 1. Detener y desregistrar NSSM
$NssmExe = (Get-Command nssm -ErrorAction SilentlyContinue).Source
if (-not $NssmExe) {
    $NssmLocal = Join-Path $ScriptDir "bin\nssm.exe"
    if (Test-Path $NssmLocal) { $NssmExe = $NssmLocal }
}

$ServiciosABorrar = @($ServiceName, "HermesOllinWorker")

foreach ($svc in $ServiciosABorrar) {
    if ($NssmExe) {
        & $NssmExe status $svc 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-OllinInfo "Deteniendo servicio NSSM '$svc'..."
            & $NssmExe stop $svc 2>$null | Out-Null
            Write-OllinInfo "Removiendo servicio NSSM '$svc'..."
            & $NssmExe remove $svc confirm 2>$null | Out-Null
            Write-OllinSuccess "Servicio NSSM '$svc' removido."
        }
    }
    
    # Fallback con sc.exe o Stop-Service
    $SvcObj = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($SvcObj) {
        Write-OllinInfo "Deteniendo servicio Windows '$svc'..."
        Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue
        Write-OllinInfo "Eliminando servicio con sc.exe delete '$svc'..."
        & sc.exe delete $svc | Out-Null
        Write-OllinSuccess "Servicio Windows '$svc' eliminado."
    }
}

# 2. Remover Tareas Programadas de Windows si existen
$TareasABorrar = @($TaskName, "OLLIN_Hermes_Worker_247", "OLLIN_Calpixqui_Worker_247")
foreach ($t in $TareasABorrar) {
    $Task = Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue
    if ($Task) {
        Write-OllinInfo "Deteniendo y eliminando Tarea Programada '$t'..."
        Stop-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $t -Confirm:$false -ErrorAction SilentlyContinue
        Write-OllinSuccess "Tarea programada '$t' desregistrada."
    }
}

# 3. Matar procesos huérfanos de worker si quedan activos
try {
    $Procs = Get-CimInstance Win32_Process | Where-Object { 
        $_.CommandLine -like "*hermes_ollin_worker.py*" -or $_.CommandLine -like "*calpixqui_worker.py*" 
    }
    foreach ($p in $Procs) {
        Write-OllinInfo "Terminando proceso huérfano PID $($p.ProcessId)..."
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    }
} catch {}

Write-OllinHeader "DESINSTALACIÓN COMPLETADA"
Write-OllinSuccess "El orquestador del Agente CALPIXQUI ha sido detenido y desregistrado del sistema."
Write-Host ""
