# PowerShell script to launch both .NET Aspire and the NodeFortuneApi with proper OTLP endpoint detection
# Use this script to ensure correct OTLP endpoint connectivity for telemetry

# Change to the solution directory
cd $PSScriptRoot

# Function to check if a port is in use
function Test-PortInUse {
    param (
        [int] $Port
    )
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect("localhost", $Port)
        $tcpClient.Close()
        return $true
    } catch {
        return $false
    }
}

# Start the Aspire dashboard first
Write-Host "Starting Aspire dashboard..." -ForegroundColor Cyan
$aspireProcess = Start-Process -FilePath "dotnet" -ArgumentList "run --project ai-app-starter-aspire.AppHost" -PassThru -WindowStyle Normal

# Wait for the Aspire dashboard to start (port 18888 is the default)
$maxRetries = 10
$retryCount = 0
$dashboardStarted = $false

Write-Host "Waiting for Aspire dashboard to start (up to 30 seconds)..." -ForegroundColor Yellow
while ($retryCount -lt $maxRetries -and -not $dashboardStarted) {
    if (Test-PortInUse -Port 18888) {
        $dashboardStarted = $true
        Write-Host "✅ Aspire dashboard started successfully on port 18888" -ForegroundColor Green
    } else {
        Start-Sleep -Seconds 3
        $retryCount++
        Write-Host "Waiting for Aspire dashboard... (Attempt $retryCount of $maxRetries)" -ForegroundColor Yellow
    }
}

if (-not $dashboardStarted) {
    Write-Host "❌ Failed to detect Aspire dashboard start. Please check if it's running in another window." -ForegroundColor Red
}

# Now check for the OTLP endpoint on port 4318
Write-Host "Checking if OTLP endpoint is available on port 4318..." -ForegroundColor Cyan
$otlpStarted = $false
$retryCount = 0

while ($retryCount -lt $maxRetries -and -not $otlpStarted) {
    if (Test-PortInUse -Port 4318) {
        $otlpStarted = $true
        Write-Host "✅ OTLP endpoint detected on port 4318" -ForegroundColor Green
    } else {
        Start-Sleep -Seconds 3
        $retryCount++
        Write-Host "Waiting for OTLP endpoint... (Attempt $retryCount of $maxRetries)" -ForegroundColor Yellow
    }
}

if (-not $otlpStarted) {
    Write-Host "⚠️ OTLP endpoint not detected on port 4318. Telemetry export may not work." -ForegroundColor Yellow
    # Override the OTLP endpoint to use a temporary file-based exporter 
    $env:OTEL_TRACES_EXPORTER = "console"
    $env:OTEL_METRICS_EXPORTER = "console"
    $env:OTEL_LOGS_EXPORTER = "console"
    Write-Host "ℹ️ Changed exporters to 'console' to allow the application to run without errors." -ForegroundColor Cyan
}

# Change to the API directory and start the Node.js application
Write-Host "Starting NodeFortuneApi..." -ForegroundColor Cyan
cd NodeFortuneApi

# Set the explicit OTLP endpoint if it's available
if ($otlpStarted) {
    $env:OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318"
    Write-Host "✅ Set OTLP endpoint to http://localhost:4318" -ForegroundColor Green
}

# Run npm install if needed
if (-not (Test-Path -Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Start the Node.js app
Write-Host "Starting the Node.js application..." -ForegroundColor Cyan
npm run dev

# Cleanup when the user presses Ctrl+C
try {
    # This will never execute since npm run dev takes control of the terminal
    Write-Host "Press CTRL+C to stop all processes" -ForegroundColor Yellow
    Wait-Process -Id $aspireProcess.Id
} finally {
    # Cleanup processes
    if ($aspireProcess -ne $null -and -not $aspireProcess.HasExited) {
        Stop-Process -Id $aspireProcess.Id -Force
        Write-Host "Stopped Aspire dashboard" -ForegroundColor Cyan
    }
}
