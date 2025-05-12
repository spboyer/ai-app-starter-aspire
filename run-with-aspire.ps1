#!/usr/bin/env pwsh
# Script to run the Aspire AppHost and Node.js application with proper OTLP integration

# Change working directory to the script location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Function to pretty-print messages
function Write-Status($message, $color = "White") {
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $message" -ForegroundColor $color
}

# Step 1: Build the Aspire AppHost project
Write-Status "Building Aspire AppHost project..." "Cyan"
dotnet build $scriptDir\ai-app-starter-aspire.AppHost\ai-app-starter-aspire.AppHost.csproj

# Step 2: Start the Aspire AppHost in a new window
Write-Status "Starting Aspire AppHost..." "Green"
Start-Process -FilePath "dotnet" -ArgumentList "run --project $scriptDir\ai-app-starter-aspire.AppHost\ai-app-starter-aspire.AppHost.csproj"

# Step 3: Wait for the AppHost to initialize
Write-Status "Waiting for Aspire dashboard to initialize (15 seconds)..." "Yellow"
Start-Sleep -Seconds 15

# Step 4: Check if the OTLP endpoint is available
$otlpEndpoint = $env:DOTNET_DASHBOARD_OTLP_ENDPOINT_URL
if (-not $otlpEndpoint) {
    # Try to find the OTLP endpoint from Aspire processes
    $aspireProcess = Get-Process -Name "Aspire.Dashboard" -ErrorAction SilentlyContinue
    if ($aspireProcess) {
        Write-Status "Found Aspire Dashboard process (PID: $($aspireProcess.Id))" "Green"
        
        # Look in launchSettings.json for the environment variable value
        $launchSettings = Get-Content -Path "$scriptDir\ai-app-starter-aspire.AppHost\Properties\launchSettings.json" -Raw | ConvertFrom-Json
        $httpProfile = $launchSettings.profiles.http
        if ($httpProfile -and $httpProfile.environmentVariables.DOTNET_DASHBOARD_OTLP_ENDPOINT_URL) {
            $otlpEndpoint = $httpProfile.environmentVariables.DOTNET_DASHBOARD_OTLP_ENDPOINT_URL
            Write-Status "Found OTLP endpoint in launch settings: $otlpEndpoint" "Green"
            
            # Set the environment variable for the current session
            $env:DOTNET_DASHBOARD_OTLP_ENDPOINT_URL = $otlpEndpoint
        }
    } else {
        Write-Status "Aspire Dashboard doesn't appear to be running!" "Red"
        Write-Status "Please start the Aspire AppHost project manually, then try again." "Yellow"
        exit 1
    }
}

if ($otlpEndpoint) {
    Write-Status "Using OTLP endpoint: $otlpEndpoint" "Green"
    
    # Set the OTEL_EXPORTER_OTLP_ENDPOINT environment variable for the Node.js app
    $env:OTEL_EXPORTER_OTLP_ENDPOINT = $otlpEndpoint
    
    # Step 5: Start the Node.js application
    Write-Status "Starting Node.js application..." "Cyan"
    Set-Location "$scriptDir\NodeFortuneApi"
    
    # Run with explicit environment variables to ensure proper telemetry
    $env:OTEL_EXPORTER_OTLP_PROTOCOL = "http/protobuf"
    $env:OTEL_SERVICE_NAME = "node-fortune-api"
    $env:OTEL_RESOURCE_ATTRIBUTES = "service.name=node-fortune-api,service.namespace=aspire,deployment.environment=development"
    $env:OTEL_TRACES_EXPORTER = "otlp"
    $env:OTEL_METRICS_EXPORTER = "otlp"
    $env:OTEL_LOGS_EXPORTER = "otlp"
    $env:OTEL_DEBUG = "true"
    
    # Start the Node.js application
    npm run dev
} else {
    Write-Status "Could not determine OTLP endpoint!" "Red"
    Write-Status "Please verify that the Aspire AppHost is running properly." "Yellow"
    exit 1
}
