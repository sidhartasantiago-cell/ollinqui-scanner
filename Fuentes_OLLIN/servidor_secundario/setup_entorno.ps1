<#
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS (QUERÉTARO / LEÓN)
MÓDULO: NODO SECUNDARIO DE AUTOMATIZACIÓN 24/7 (AGENTE CALPIXQUI / CALPIX)
ARCHIVO: setup_entorno.ps1
PROPÓSITO:
Automatizar la instalación, verificación y preparación del entorno de ejecución
del Agente CALPIXQUI en la PC Secundaria (Core i3-6100, 16 GB RAM, SSD, Tailscale).
================================================================================
#>

[CmdletBinding()]
param (
    [switch]$SkipInstallers = $false,
    [switch]$ForceVenv = $false
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Colores para salida visual clara
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
Write-OllinHeader "INICIALIZACIÓN DEL AGENTE CALPIXQUI 24/7 (CALPIX)"
Write-OllinInfo "Directorio de trabajo: $ScriptDir"
Write-OllinInfo "Fecha y hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# ------------------------------------------------------------------------------
# 1. VERIFICACIÓN DE PRIVILEGIOS DE ADMINISTRADOR
# ------------------------------------------------------------------------------
Write-OllinHeader "1. VERIFICACIÓN DE PRIVILEGIOS"
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($IsAdmin) {
    Write-OllinSuccess "Ejecutando con privilegios de Administrador."
} else {
    Write-OllinWarn "Ejecutando sin privilegios de Administrador."
    Write-OllinWarn "Para registrar servicios de Windows o instalar paquetes con winget se requieren privilegios elevados."
    Write-OllinInfo "Si alguna instalación falla, abre PowerShell como Administrador y vuelve a ejecutar."
}

# ------------------------------------------------------------------------------
# 2. VERIFICACIÓN DE HARDWARE Y RECURSOS
# ------------------------------------------------------------------------------
Write-OllinHeader "2. DIAGNÓSTICO DE HARDWARE Y MEMORIA"
try {
    $ComputerInfo = Get-CimInstance Win32_ComputerSystem
    $Processor = Get-CimInstance Win32_Processor | Select-Object -First 1
    $OS = Get-CimInstance Win32_OperatingSystem
    $TotalRAM_GB = [math]::Round($OS.TotalVisibleMemorySize / 1MB, 2)
    $FreeRAM_GB  = [math]::Round($OS.FreePhysicalMemory / 1MB, 2)
    
    Write-OllinInfo "CPU: $($Processor.Name)"
    Write-OllinInfo "RAM Total: $TotalRAM_GB GB (Libre: $FreeRAM_GB GB)"
    Write-OllinInfo "SO: $($OS.Caption) ($($OS.OSArchitecture))"
    
    if ($TotalRAM_GB -ge 12) {
        Write-OllinSuccess "Memoria RAM óptima para orquestador asíncrono y buffer de cola."
    } else {
        Write-OllinWarn "RAM disponible menor a 12 GB. Monitorear consumo de buffer."
    }
} catch {
    Write-OllinWarn "No se pudo consultar información detallada de hardware: $_"
}

# ------------------------------------------------------------------------------
# 3. VERIFICACIÓN Y VALIDACIÓN DE TAILSCALE
# ------------------------------------------------------------------------------
Write-OllinHeader "3. ESTADO DE LA RED TAILSCALE"
$TailscaleExe = (Get-Command tailscale.exe -ErrorAction SilentlyContinue)
if (-not $TailscaleExe) {
    # Buscar en rutas habituales
    $PosiblesRutas = @(
        "$env:ProgramFiles\Tailscale\tailscale.exe",
        "$env:LOCALAPPDATA\Tailscale\tailscale.exe"
    )
    foreach ($r in $PosiblesRutas) {
        if (Test-Path $r) {
            $TailscaleExe = $r
            break
        }
    }
}

if ($TailscaleExe) {
    try {
        $TsStatus = & $TailscaleExe status --json | ConvertFrom-Json
        $TsIP = $TsStatus.TailscaleIPs[0]
        $SelfNode = $TsStatus.Self.HostName
        Write-OllinSuccess "Tailscale activo y conectado."
        Write-OllinInfo "Host: $SelfNode"
        Write-OllinInfo "IP de Tailscale del Nodo: $TsIP"
    } catch {
        Write-OllinWarn "Tailscale instalado pero no se pudo leer el estado JSON. Verifica inicio de sesión."
    }
} else {
    Write-OllinWarn "Tailscale no detectado en el PATH."
    Write-OllinInfo "Instalar vía winget si es necesario: winget install Tailscale.Tailscale -e"
}

# ------------------------------------------------------------------------------
# 4. VERIFICACIÓN E INSTALACIÓN DE PYTHON 3.11+
# ------------------------------------------------------------------------------
Write-OllinHeader "4. VERIFICACIÓN DEL ENTORNO PYTHON"
$PythonCmd = $null
foreach ($cmd in @("python", "python3", "py")) {
    $res = Get-Command $cmd -ErrorAction SilentlyContinue
    if ($res) {
        try {
            $verOutput = & $cmd --version 2>&1
            if ($verOutput -match "Python (\d+)\.(\d+)") {
                $major = [int]$matches[1]
                $minor = [int]$matches[2]
                if ($major -ge 3 -and $minor -ge 10) {
                    $PythonCmd = $cmd
                    Write-OllinSuccess "Python detectado: $verOutput ($($res.Source))"
                    break
                }
            }
        } catch {}
    }
}

if (-not $PythonCmd -and -not $SkipInstallers) {
    Write-OllinWarn "Python 3.10+ no encontrado. Intentando instalación vía winget..."
    try {
        winget install Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements
        Write-OllinInfo "Instalación de Python enviada. Revisa que esté disponible en PATH."
        $PythonCmd = "python"
    } catch {
        Write-OllinError "No se pudo instalar Python vía winget automáticamente. Instala Python 3.11 manualmente."
    }
} elseif (-not $PythonCmd) {
    Write-OllinError "Python 3.10+ es requerido para Hermes Worker."
}

# ------------------------------------------------------------------------------
# 5. VERIFICACIÓN DE NODE.JS Y GIT
# ------------------------------------------------------------------------------
Write-OllinHeader "5. VERIFICACIÓN DE HERRAMIENTAS ADICIONALES (NODE & GIT)"
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($NodeCmd) {
    $NodeVer = & node --version
    Write-OllinSuccess "Node.js detectado: $NodeVer"
} else {
    Write-OllinWarn "Node.js no encontrado. (Opcional, pero recomendado si se usan sidecars npm)."
}

$GitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($GitCmd) {
    $GitVer = & git --version
    Write-OllinSuccess "Git detectado: $GitVer"
} else {
    Write-OllinWarn "Git no encontrado. Se recomienda instalar para control de versiones."
}

# ------------------------------------------------------------------------------
# 6. ESTRUCTURA DE DIRECTORIOS DE TRABAJO
# ------------------------------------------------------------------------------
Write-OllinHeader "6. CREACIÓN DE DIRECTORIOS DE TRABAJO"
$Carpetas = @(
    (Join-Path $ScriptDir "logs"),
    (Join-Path $ScriptDir "inbox_multimodal"),
    (Join-Path $ScriptDir "procesados"),
    (Join-Path $ScriptDir "fallidos"),
    (Join-Path $ScriptDir "cache_temp")
)

foreach ($c in $Carpetas) {
    if (-not (Test-Path $c)) {
        New-Item -ItemType Directory -Path $c -Force | Out-Null
        Write-OllinSuccess "Directorio creado: $(Split-Path $c -Leaf)"
    } else {
        Write-OllinInfo "Directorio existente: $(Split-Path $c -Leaf)"
    }
}

# ------------------------------------------------------------------------------
# 7. CONFIGURACIÓN DEL ENTORNO VIRTUAL (.venv)
# ------------------------------------------------------------------------------
Write-OllinHeader "7. CONFIGURACIÓN DE PYTHON VENV Y DEPENDENCIAS"
$VenvDir = Join-Path $ScriptDir ".venv"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$VenvPip = Join-Path $VenvDir "Scripts\pip.exe"

if ($PythonCmd) {
    if ($ForceVenv -and (Test-Path $VenvDir)) {
        Write-OllinInfo "Recreando .venv forzadamente..."
        Remove-Item -Recurse -Force $VenvDir
    }
    
    if (-not (Test-Path $VenvPython)) {
        Write-OllinInfo "Creando entorno virtual Python en: $VenvDir ..."
        & $PythonCmd -m venv $VenvDir
        if (Test-Path $VenvPython) {
            Write-OllinSuccess "Entorno virtual creado con éxito."
        } else {
            Write-OllinError "Falló la creación del entorno virtual."
        }
    } else {
        Write-OllinSuccess "Entorno virtual .venv existente y listo."
    }
    
    # Instalación de requerimientos
    $ReqFile = Join-Path $ScriptDir "requirements.txt"
    if ((Test-Path $VenvPip) -and (Test-Path $ReqFile)) {
        Write-OllinInfo "Actualizando pip e instalando dependencias de requirements.txt..."
        & $VenvPip install --upgrade pip --quiet
        & $VenvPip install -r $ReqFile
        if ($LASTEXITCODE -eq 0) {
            Write-OllinSuccess "Dependencias Python instaladas satisfactoriamente."
        } else {
            Write-OllinWarn "Advertencia al instalar dependencias. Revisa los mensajes de pip."
        }
    }
}

# ------------------------------------------------------------------------------
# 8. VERIFICACIÓN DEL ARCHIVO .env
# ------------------------------------------------------------------------------
Write-OllinHeader "8. VERIFICACIÓN DE CONFIGURACIÓN (.env)"
$EnvFile = Join-Path $ScriptDir ".env"
$EnvTemplate = Join-Path $ScriptDir ".env.template"

if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvTemplate) {
        Copy-Item -Path $EnvTemplate -Destination $EnvFile
        Write-OllinWarn "Archivo .env no existía. Se copió desde .env.template."
        Write-OllinWarn "IMPORTANTE: Edita $EnvFile y configura tu GEMINI_API_KEY antes de iniciar el servicio."
    } else {
        Write-OllinError "No se encontró .env ni .env.template."
    }
} else {
    Write-OllinSuccess "Archivo .env detectado."
    # Verificar si contiene la clave de Gemini
    $EnvContent = Get-Content $EnvFile -Raw
    if ($EnvContent -match "GEMINI_API_KEY=(.+)") {
        $keyVal = $matches[1].Trim()
        if ($keyVal -and $keyVal -ne "TU_GEMINI_API_KEY_AQUI") {
            Write-OllinSuccess "GEMINI_API_KEY configurada."
        } else {
            Write-OllinWarn "GEMINI_API_KEY está vacía o con valor por defecto en .env."
        }
    }
}

Write-OllinHeader "RESUMEN DEL SETUP"
Write-OllinSuccess "El entorno base en la PC Secundaria está preparado."
Write-OllinInfo "Siguiente paso: Ejecuta .\registrar_servicio_247.ps1 para registrar el daemon como servicio de fondo."
Write-OllinInfo "Para probar en primer plano: & '$VenvPython' hermes_ollin_worker.py"
Write-Host ""
