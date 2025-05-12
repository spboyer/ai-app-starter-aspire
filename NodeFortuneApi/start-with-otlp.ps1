#!/usr/bin/env pwsh
# Start Node.js application with OTLP telemetry enabled

# Function to write timestamps for log messages
function Write-TimeLog($message, $color = "White") {
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $message" -ForegroundColor $color
}

# Set the working directory
Set-Location -Path "C:\github\ai-app-starter-aspire\NodeFortuneApi"

# Check if Aspire dashboard is running
$aspireProcess = Get-Process -Name "Aspire.Dashboard" -ErrorAction SilentlyContinue
if (-not $aspireProcess) {
    Write-TimeLog "Warning: Aspire Dashboard is not running. Telemetry may not work." "Yellow"
    Write-TimeLog "Consider running ./fix-aspire-otel.ps1 first to start Aspire." "Yellow"
}

# Check the current .otelenv file
$otelEnvPath = ".\.otelenv"
if (Test-Path $otelEnvPath) {
    $otelEnv = Get-Content $otelEnvPath -Raw
    Write-TimeLog "Current OTLP settings:" "Cyan"
    
    if ($otelEnv -match 'OTEL_EXPORTER_OTLP_ENDPOINT=(.*)') {
        $endpoint = $matches[1]
        Write-TimeLog "- OTLP Endpoint: $endpoint" "Green"
    } else {
        Write-TimeLog "- No OTLP endpoint configured" "Red"
    }
    
    if ($otelEnv -match 'NODE_TLS_REJECT_UNAUTHORIZED=(.*)') {
        $tlsValue = $matches[1]
        if ($tlsValue -eq "0") {
            Write-TimeLog "- TLS certificate validation: Disabled" "Yellow"
        } else {
            Write-TimeLog "- TLS certificate validation: Enabled" "Green"
        }
    } else {
        Write-TimeLog "- TLS certificate validation: Not configured" "Yellow"
    }
}

# Start the Node.js application with OTEL debug enabled
Write-TimeLog "Starting Node.js application with OpenTelemetry debugging enabled..." "Cyan"
Write-TimeLog "Press Ctrl+C to stop" "Yellow"

# Use cross-env to ensure env vars work across platforms
$env:OTEL_DEBUG = "true"

# Start the application
npm run dev

# The script will end when the Node.js application ends
