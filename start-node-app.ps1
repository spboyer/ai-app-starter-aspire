#!/usr/bin/env pwsh
# Change working directory to the script location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Determine if Aspire dashboard is running
$aspireProcess = Get-Process -Name "Aspire.Dashboard" -ErrorAction SilentlyContinue

if ($null -eq $aspireProcess) {
    Write-Host "Aspire Dashboard is not running. Starting in fallback mode..." -ForegroundColor Yellow
    
    # Use the fallback configuration
    if (Test-Path "$scriptDir\NodeFortuneApi\.otelenv.fallback") {
        Copy-Item -Path "$scriptDir\NodeFortuneApi\.otelenv.fallback" -Destination "$scriptDir\NodeFortuneApi\.otelenv" -Force
        Write-Host "Configured Node.js to use console exporters instead of OTLP" -ForegroundColor Green
    } else {
        Write-Host "Fallback configuration not found. Creating basic config..." -ForegroundColor Yellow
        @"
# Fallback OpenTelemetry configuration
OTEL_TRACES_EXPORTER=console
OTEL_METRICS_EXPORTER=console
OTEL_LOGS_EXPORTER=console
"@ | Set-Content -Path "$scriptDir\NodeFortuneApi\.otelenv"
    }
    
    # Start the Node.js application without Aspire
    Write-Host "Starting Node.js application in standalone mode..." -ForegroundColor Cyan
    Set-Location "$scriptDir\NodeFortuneApi"
    npm run dev
} else {
    Write-Host "Aspire Dashboard is running (PID: $($aspireProcess.Id)). Starting with Aspire integration..." -ForegroundColor Green
    
    # Get Aspire dashboard port from the process
    $aspirePort = (netstat -ano | Select-String -Pattern "LISTENING\s+$($aspireProcess.Id)" | Where-Object { $_ -match "TCP" } | Select-Object -First 1) -replace '.*TCP\s+127\.0\.0\.1:(\d+).*', '$1'
    
    if ($aspirePort) {
        Write-Host "Detected Aspire dashboard on port: $aspirePort" -ForegroundColor Green
        
        # Calculate the OTLP port
        $otlpPort = [int]$aspirePort + 1000
        Write-Host "Using OTLP port: $otlpPort" -ForegroundColor Green
        
        # Create custom .otelenv file with the detected ports
        @"
# Generated OpenTelemetry configuration for Aspire
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:$otlpPort
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_SERVICE_NAME=node-fortune-api
OTEL_RESOURCE_ATTRIBUTES=service.name=node-fortune-api,service.namespace=aspire,deployment.environment=development
OTEL_DEBUG=true
"@ | Set-Content -Path "$scriptDir\NodeFortuneApi\.otelenv"
    } else {
        Write-Host "Could not determine Aspire dashboard port. Using fallback configuration..." -ForegroundColor Yellow
        Copy-Item -Path "$scriptDir\NodeFortuneApi\.otelenv.fallback" -Destination "$scriptDir\NodeFortuneApi\.otelenv" -Force
    }
    
    # Start the Node.js application with Aspire configuration
    Write-Host "Starting Node.js application with Aspire integration..." -ForegroundColor Cyan
    Set-Location "$scriptDir\NodeFortuneApi"
    npm run dev
}
