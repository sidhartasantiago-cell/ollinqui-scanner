<#
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: NODO SECUNDARIO DE AUTOMATIZACIÓN 24/7 (AGENTE CALPIXQUI / CALPIX)
ARCHIVO: registrar_servicio_247.ps1
PROPÓSITO:
Registrar el orquestador del Agente CALPIXQUI como servicio de fondo persistente
24/7 en Windows. Garantiza que ante un reinicio de la PC secundaria (Core i3-6100),
el orquestador se inicie automáticamente en el arranque del sistema, sin requerir
inicio de sesión interactivo de usuario.
================================================================================
#>

[CmdletBinding()]
param (
    [ValidateSet("Auto", "NSSM", "TaskScheduler")]
    [string]$Metodo = "Auto",
    [string]$ServiceName = "CalpixquiWorker"
)

$ErrorActionPreference = "Stop"
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

function Write-OllinWarn {
    param([string]$Mensaje)
    Write-Host "  [⚠] $Mensaje" -ForegroundColor Yellow
}

function Write-OllinError {
    param([string]$Mensaje)
    Write-Host "  [✖] $Mensaje" -ForegroundColor Red
}

function Write-OllinInfo {
    param([string]$Mensaje)
    Write-Host "  [ℹ] $Mensaje" -ForegroundColor White
}

Clear-Host
Write-OllinHeader "REGISTRO DE SERVICIO 24/7 — NODO HERMES"

# ------------------------------------------------------------------------------
# 1. VALIDACIÓN DE PRIVILEGIOS DE ADMINISTRADOR
# ------------------------------------------------------------------------------
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
    Write-OllinError "Este script requiere ejecutarse como Administrador para registrar servicios de Windows o tareas del sistema."
    Write-OllinInfo "Por favor, abre PowerShell con 'Ejecutar como Administrador' y vuelve a intentar."
    exit 1
}

# ------------------------------------------------------------------------------
# 2. LOCALIZACIÓN DE RUTAS CLAVE
# ------------------------------------------------------------------------------
$VenvPython = Join-Path $ScriptDir ".venv\Scripts\python.exe"
$WorkerScript = Join-Path $ScriptDir "hermes_ollin_worker.py"
$LogsDir = Join-Path $ScriptDir "logs"
$StdoutLog = Join-Path $LogsDir "hermes_service_stdout.log"
$StderrLog = Join-Path $LogsDir "hermes_service_stderr.log"

if (-not (Test-Path $WorkerScript)) {
    Write-OllinError "No se encontró el script orquestador: $WorkerScript"
    exit 1
}

if (-not (Test-Path $VenvPython)) {
    Write-OllinWarn "Entorno virtual .venv no detectado. Buscando python en el sistema..."
    $SysPython = (Get-Command python -ErrorAction SilentlyContinue).Source
    if ($SysPython) {
        $VenvPython = $SysPython
        Write-OllinInfo "Usando Python del sistema: $VenvPython"
    } else {
        Write-OllinError "No se encontró ningún intérprete de Python. Ejecuta primero .\setup_entorno.ps1"
        exit 1
    }
} else {
    Write-OllinSuccess "Python virtualenv validado: $VenvPython"
}

if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
}

# ------------------------------------------------------------------------------
# 3. DETECCIÓN / DESCARGA DE NSSM
# ------------------------------------------------------------------------------
$NssmExe = $null
$NssmLocal = Join-Path $ScriptDir "bin\nssm.exe"

if (Test-Path $NssmLocal) {
    $NssmExe = $NssmLocal
} else {
    $CmdNssm = (Get-Command nssm -ErrorAction SilentlyContinue)
    if ($CmdNssm) {
        $NssmExe = $CmdNssm.Source
    }
}

if (-not $NssmExe -and ($Metodo -eq "Auto" -or $Metodo -eq "NSSM")) {
    Write-OllinInfo "NSSM no detectado localmente. Intentando descarga segura de NSSM 2.24..."
    try {
        $BinDir = Join-Path $ScriptDir "bin"
        if (-not (Test-Path $BinDir)) { New-Item -ItemType Directory -Path $BinDir -Force | Out-Null }
        
        $ZipPath = Join-Path $BinDir "nssm.zip"
        $NssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
        
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $NssmUrl -OutFile $ZipPath -UseBasicParsing -TimeoutSec 15
        
        Expand-Archive -Path $ZipPath -DestinationPath (Join-Path $BinDir "temp_nssm") -Force
        $ExtractedNssm = Join-Path $BinDir "temp_nssm\nssm-2.24\win64\nssm.exe"
        if (Test-Path $ExtractedNssm) {
            Move-Item -Path $ExtractedNssm -Destination $NssmLocal -Force
            Remove-Item -Recurse -Force (Join-Path $BinDir "temp_nssm")
            Remove-Item -Force $ZipPath
            $NssmExe = $NssmLocal
            Write-OllinSuccess "NSSM 2.24 descargado y configurado en: $NssmExe"
        }
    } catch {
        Write-OllinWarn "No se pudo descargar NSSM vía web: $_"
        if ($Metodo -eq "NSSM") {
            Write-OllinError "Se requirió explícitamente el método NSSM pero no está disponible."
            exit 1
        }
    }
}

# ------------------------------------------------------------------------------
# 4. REGISTRO DEL SERVICIO SEGÚN MÉTODO
# ------------------------------------------------------------------------------
if ($NssmExe -and ($Metodo -eq "Auto" -or $Metodo -eq "NSSM")) {
    Write-OllinHeader "REGISTRANDO SERVICIO VÍA NSSM (SERVICIO NATIVO WINDOWS)"
    
    # Detener y remover si ya existe (tanto CalpixquiWorker como HermesOllinWorker)
    foreach ($oldSvc in @($ServiceName, "HermesOllinWorker")) {
        & $NssmExe status $oldSvc 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-OllinInfo "Deteniendo y actualizando servicio preexistente '$oldSvc'..."
            & $NssmExe stop $oldSvc 2>$null | Out-Null
            & $NssmExe remove $oldSvc confirm 2>$null | Out-Null
            Start-Sleep -Seconds 1
        }
    }
    
    # Instalación con NSSM
    & $NssmExe install $ServiceName "$VenvPython" "$WorkerScript"
    & $NssmExe set $ServiceName AppDirectory "$ScriptDir"
    & $NssmExe set $ServiceName Description "Agente CALPIXQUI - Guardian de la Casa, Administrador de Boveda y Orquestador 24/7 (Ecosistema OLLIN)"
    & $NssmExe set $ServiceName Start SERVICE_AUTO_START
    & $NssmExe set $ServiceName AppStdout "$StdoutLog"
    & $NssmExe set $ServiceName AppStderr "$StderrLog"
    & $NssmExe set $ServiceName AppRestartDelay 5000
    & $NssmExe set $ServiceName AppEnvironmentExtra "PYTHONUNBUFFERED=1"
    
    Write-OllinSuccess "Servicio de Windows '$ServiceName' registrado correctamente con NSSM."
    
    # Iniciar servicio
    Write-OllinInfo "Iniciando servicio..."
    & $NssmExe start $ServiceName
    Start-Sleep -Seconds 3
    
    $SvcObj = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($SvcObj -and $SvcObj.Status -eq "Running") {
        Write-OllinSuccess "¡Servicio '$ServiceName' está en ejecución activa (Running)!"
    } else {
        Write-OllinWarn "El servicio fue registrado pero su estado actual es: $($SvcObj.Status). Revisa logs en $StderrLog"
    }

} else {
    Write-OllinHeader "REGISTRANDO TAREA PROGRAMADA DE INICIO DEL SISTEMA (HEADLESS 24/7)"
    Write-OllinInfo "Configurando Tarea Programada de Windows (AtStartup, SYSTEM, sin sesión interactiva)."
    
    $TaskName = "OLLIN_Calpixqui_Worker_247"
    
    # Desregistrar tareas previas si existen
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName "OLLIN_Hermes_Worker_247" -Confirm:$false -ErrorAction SilentlyContinue
    
    $Action = New-ScheduledTaskAction -Execute "$VenvPython" -Argument "`"$WorkerScript`"" -WorkingDirectory "$ScriptDir"
    $Trigger = New-ScheduledTaskTrigger -AtStartup
    $Principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    
    $Settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -RestartCount 5 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit ([TimeSpan]::Zero) `
        -Priority 4
    
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Principal $Principal `
        -Settings $Settings `
        -Description "Agente CALPIXQUI - Guardian de la Casa y Administrador de Boveda 24/7 (Ecosistema OLLIN)" | Out-Null
    
    Write-OllinSuccess "Tarea programada de sistema '$TaskName' creada con éxito."
    
    # Iniciar inmediatamente
    Write-OllinInfo "Lanzando tarea programada..."
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 3
    
    $TaskInfo = Get-ScheduledTask -TaskName $TaskName
    Write-OllinSuccess "Estado de la tarea: $($TaskInfo.State)"
}

# ------------------------------------------------------------------------------
# 5. VERIFICACIÓN DE CONECTIVIDAD LOCAL HTTP
# ------------------------------------------------------------------------------
Write-OllinHeader "VERIFICACIÓN DEL ENDPOINT HTTP /health"
Start-Sleep -Seconds 3

$HealthUrl = "http://localhost:8088/health"
try {
    $Resp = Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 5
    Write-OllinSuccess "Nodo Hermes respondiendo en HTTP: $($Resp.estado)"
    Write-OllinInfo "Uptime: $($Resp.uptime_segundos)s | RAM Usada: $($Resp.hardware.ram_usada_gb) GB ($($Resp.hardware.ram_porcentaje)%)"
    Write-OllinInfo "Tailscale Activo: $($Resp.red.tailscale_activo) | IP: $($Resp.red.tailscale_ip_nodo)"
} catch {
    Write-OllinWarn "El servicio está iniciando o aún no escucha en el puerto 8088. Consulta los logs en $LogsDir"
}

Write-OllinHeader "RESUMEN DE DESPLIEGUE"
Write-OllinSuccess "Configuración 24/7 completada."
Write-OllinInfo "Logs en tiempo real: Get-Content '$StdoutLog' -Wait"
Write-OllinInfo "Desinstalación limpia disponible con: .\desinstalar_servicio_247.ps1"
Write-Host ""
