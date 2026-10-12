<#
.SYNOPSIS
    Inicia el Gateway Headless de WhatsApp para CALPIXQUI en segundo plano (puerto 3001).
.DESCRIPTION
    Arranca 'node gateway.js' como un proceso desacoplado en segundo plano (hidden)
    y verifica que el endpoint de salud responda.
#>

param(
    [switch]$Foreground,
    [switch]$Stop
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

if ($Stop) {
    Write-Host "🛑 Deteniendo procesos de gateway.js..." -ForegroundColor Yellow
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object {
        $_.CommandLine -like "*gateway.js*"
    } | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force
        Write-Host "Proceso $($_.ProcessId) terminado." -ForegroundColor Green
    }
    exit 0
}

# 1. Verificar si ya está corriendo en el puerto 3001
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
    if ($resp.ready) {
        Write-Host "🟢 Gateway ya está ONLINE y LISTO en http://localhost:3001" -ForegroundColor Green
        Write-Host "   Número: $($resp.numero_vinculado)"
        exit 0
    } else {
        Write-Host "⏳ Gateway ya está corriendo pero aún inicializando o esperando QR." -ForegroundColor Yellow
        exit 0
    }
} catch {
    # No está corriendo, proceder a arrancar
}

Write-Host "🚀 Iniciando Gateway Headless WhatsApp..." -ForegroundColor Cyan

if ($Foreground) {
    & node gateway.js
} else {
    $proc = Start-Process -FilePath "node" -ArgumentList "gateway.js" -WorkingDirectory $scriptDir -WindowStyle Hidden -PassThru
    Write-Host "Proceso lanzado con PID: $($proc.Id)" -ForegroundColor Green

    # Esperar hasta 10 segundos a que responda /health
    $ok = $false
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Seconds 1
        try {
            $resp = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
            Write-Host "✅ Gateway respondiendo en http://localhost:3001 (Status: $($resp.status))" -ForegroundColor Green
            $ok = $true
            break
        } catch {}
    }

    if (-not $ok) {
        Write-Host "⚠️ El gateway está iniciando. Revisa los logs en ..\logs\hermes_*.log" -ForegroundColor Yellow
    }
}
