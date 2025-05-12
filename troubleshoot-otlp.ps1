#!/usr/bin/env pwsh
# Script to troubleshoot Aspire and OpenTelemetry connectivity issues

Write-Host "Aspire OpenTelemetry Troubleshooting Tool" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Detect Aspire processes
Write-Host "Checking for running Aspire processes..." -ForegroundColor Green
$aspireProcess = Get-Process -Name "Aspire.Dashboard" -ErrorAction SilentlyContinue
$appHostProcess = Get-Process | Where-Object { $_.ProcessName -match "ai-app-starter-aspire.AppHost" }
$isDashboardRunning = $null -ne $aspireProcess

if ($isDashboardRunning) {
    Write-Host "✅ Aspire Dashboard is running (PID: $($aspireProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "❌ Aspire Dashboard is not running." -ForegroundColor Red
    Write-Host "Would you like to start the Aspire AppHost project now? (y/n)" -ForegroundColor Yellow
    $startAspire = Read-Host
    
    if ($startAspire -eq "y") {
        Write-Host "Starting Aspire AppHost..." -ForegroundColor Yellow
        Start-Process -FilePath "dotnet" -ArgumentList "run --project ai-app-starter-aspire.AppHost" -WorkingDirectory "c:\github\ai-app-starter-aspire" -NoNewWindow
        Write-Host "Waiting for Aspire to start (15 seconds)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 15
    } else {
        Write-Host "Please start the Aspire AppHost project manually and try again." -ForegroundColor Yellow
        exit
    }
}

# Check network port availability
Write-Host "Checking network ports..." -ForegroundColor Green
$ports = @(4318, 19888, 18888)

foreach ($port in $ports) {
    try {
        $listener = New-Object System.Net.Sockets.TcpClient
        $result = $listener.BeginConnect("localhost", $port, $null, $null)
        $success = $result.AsyncWaitHandle.WaitOne(1000, $true)
        
        if ($success) {
            $listener.EndConnect($result)
            Write-Host "✅ Port $port is open and accessible" -ForegroundColor Green
        } else {
            Write-Host "❌ Port $port is not accessible" -ForegroundColor Red
        }
        
        $listener.Close()
    } catch {
        Write-Host "❌ Port $port check failed: $_" -ForegroundColor Red
    }
}

# Update .otelenv file with multiple endpoints
Write-Host "Updating NodeFortuneApi .otelenv file with multiple endpoint options..." -ForegroundColor Green
$otelEnvPath = Join-Path (Get-Location) "NodeFortuneApi\.otelenv"

if (Test-Path $otelEnvPath) {
    $content = Get-Content $otelEnvPath -Raw
    
    # Update or add alternative endpoints
    $endpoints = "http://localhost:19888,http://localhost:18888,http://localhost:4318,http://127.0.0.1:19888"
    
    if ($content -match "OTLP_ALTERNATIVE_ENDPOINTS=") {
        $content = $content -replace "OTLP_ALTERNATIVE_ENDPOINTS=.+", "OTLP_ALTERNATIVE_ENDPOINTS=$endpoints"
    } else {
        $content += "`nOTLP_ALTERNATIVE_ENDPOINTS=$endpoints`n"
    }
    
    # Set the primary endpoint to all possible values
    $content = $content -replace "OTEL_EXPORTER_OTLP_ENDPOINT=.+", "OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:19888"
    
    # Enable debug and show errors
    $content = $content -replace "OTEL_DEBUG=.+", "OTEL_DEBUG=true"
    $content = $content -replace "SHOW_OTLP_ERRORS=.+", "SHOW_OTLP_ERRORS=true"
    
    Set-Content -Path $otelEnvPath -Value $content
    Write-Host "✅ Updated .otelenv file with new settings" -ForegroundColor Green
} else {
    Write-Host "❌ Could not find .otelenv file at $otelEnvPath" -ForegroundColor Red
}

# Run a Node connectivity test
Write-Host "Running OTLP connectivity test from Node.js..." -ForegroundColor Green
$nodeOutput = $null
try {
    Set-Location -Path "c:\github\ai-app-starter-aspire\NodeFortuneApi"
    $nodeOutput = & npm run check-otlp 2>&1
    Write-Host $nodeOutput -ForegroundColor Gray
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Node.js successfully connected to an OTLP endpoint" -ForegroundColor Green
    } else {
        Write-Host "❌ Node.js failed to connect to any OTLP endpoint" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error running Node.js connectivity test: $_" -ForegroundColor Red
}

# Recommendations
Write-Host "`nRecommendations:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

# Parse output to detect which endpoint worked
$workingEndpoint = if ($nodeOutput -match "Successfully connected to alternative endpoint: (http://[^\s]+)") {
    $matches[1]
} elseif ($nodeOutput -match "Successfully connected to OTLP endpoint") {
    "http://localhost:19888"  # Default if primary worked
} else {
    $null
}

if ($workingEndpoint) {
    Write-Host "✅ Use this OTLP endpoint in your configuration: $workingEndpoint" -ForegroundColor Green
    
    # Update appsettings.json in AppHost project
    $appSettingsPath = Join-Path (Get-Location) "..\ai-app-starter-aspire.AppHost\appsettings.json"
    if (Test-Path $appSettingsPath) {
        $appSettings = Get-Content $appSettingsPath -Raw | ConvertFrom-Json
        $appSettings.Aspire.Otlp.Endpoint = $workingEndpoint
        $appSettings.Aspire.Otlp.ListenOnAllAddresses = $true
        $appSettings | ConvertTo-Json -Depth 10 | Set-Content $appSettingsPath
        Write-Host "✅ Updated AppHost appsettings.json with working endpoint" -ForegroundColor Green
    }
    
    # Update .otelenv file
    $otelEnvPath = Join-Path (Get-Location) ".otelenv"
    if (Test-Path $otelEnvPath) {
        $content = Get-Content $otelEnvPath -Raw
        $content = $content -replace "OTEL_EXPORTER_OTLP_ENDPOINT=.+", "OTEL_EXPORTER_OTLP_ENDPOINT=$workingEndpoint"
        Set-Content -Path $otelEnvPath -Value $content
        Write-Host "✅ Updated .otelenv with working endpoint" -ForegroundColor Green
    }
} else {
    Write-Host "1. Make sure the Aspire dashboard is running" -ForegroundColor Yellow
    Write-Host "2. Check your firewall settings to allow connections on ports 18888 and 19888" -ForegroundColor Yellow 
    Write-Host "3. Try restarting the Aspire dashboard with administrator privileges" -ForegroundColor Yellow
    Write-Host "4. Set 'ListenOnAllAddresses' to true in appsettings.json" -ForegroundColor Yellow
}

Write-Host "`nTroubleshooting complete. Try running your application now." -ForegroundColor Cyan
