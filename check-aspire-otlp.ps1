#!/usr/bin/env pwsh
# Script to verify Aspire OTLP connectivity

# Get the DOTNET_DASHBOARD_OTLP_ENDPOINT_URL from the environment
$otlpEndpoint = $env:DOTNET_DASHBOARD_OTLP_ENDPOINT_URL

if (-not $otlpEndpoint) {
    Write-Host "No DOTNET_DASHBOARD_OTLP_ENDPOINT_URL environment variable found!" -ForegroundColor Red
    Write-Host "Make sure you're running from an Aspire environment (launch the Aspire AppHost project first)" -ForegroundColor Yellow
    Write-Host ""
    
    # Try to find Aspire processes to help diagnose the issue
    $aspireProcess = Get-Process -Name "Aspire.Dashboard" -ErrorAction SilentlyContinue
    if ($aspireProcess) {
        Write-Host "Found Aspire Dashboard process (PID: $($aspireProcess.Id))" -ForegroundColor Green
        Write-Host "Let's check which ports it's using..." -ForegroundColor Yellow
          # Try to find the ports the Aspire process is listening on
        $netstat = netstat -ano | findstr $aspireProcess.Id
        Write-Host "Aspire ports:" -ForegroundColor Yellow
        Write-Host $netstat -ForegroundColor Gray
        
        # Extract the port from the netstat output
        $ports = $netstat | ForEach-Object {
            if ($_ -match ".*TCP\s+.*?:(\d+)\s+.*") {
                $matches[1]
            }
        } | Sort-Object -Unique
        
        if ($ports) {
            Write-Host ""
            Write-Host "Based on port analysis, try these OTLP endpoints:" -ForegroundColor Green
            foreach ($port in $ports) {
                if ($port -ne "0") {  # Skip invalid port 0
                    Write-Host "http://localhost:$port" -ForegroundColor Cyan
                    # Also suggest port+1000 as Aspire often uses port+1000 for OTLP
                    $otlpPort = [int]$port + 1000
                    Write-Host "http://localhost:$otlpPort (dashboard port + 1000)" -ForegroundColor Cyan
                }
            }
        }
    } else {
        Write-Host "No Aspire Dashboard process was found running!" -ForegroundColor Red
        Write-Host "Start the Aspire AppHost project first, then run this script again." -ForegroundColor Yellow
    }
    exit 1
}

Write-Host "Found OTLP endpoint: $otlpEndpoint" -ForegroundColor Green
Write-Host "Testing connectivity..." -ForegroundColor Yellow

# Parse the URL to get host and port
$uri = [System.Uri]$otlpEndpoint
$hostname = $uri.Host
$port = $uri.Port

# If no port was specified, use the default port based on the scheme
if ($port -eq -1) {
    if ($uri.Scheme -eq "https") {
        $port = 443
    } else {
        $port = 80
    }
}

# Test TCP connectivity
try {
    $client = New-Object System.Net.Sockets.TcpClient
    $connection = $client.BeginConnect($hostname, $port, $null, $null)
    $wait = $connection.AsyncWaitHandle.WaitOne(1000, $false)
    
    if ($wait -and $client.Connected) {
        Write-Host "✅ Successfully connected to $hostname on port $port" -ForegroundColor Green
        $client.Close()
        
        # Let's verify the endpoint is an OTLP endpoint by attempting an HTTP request
        try {
            $response = Invoke-WebRequest -Uri "$otlpEndpoint/v1/metrics" -Method Options -TimeoutSec 2 -ErrorAction SilentlyContinue
            Write-Host "✅ The endpoint responded to an OTLP protocol request" -ForegroundColor Green
        } catch {
            # This might still be fine, as the endpoint might refuse OPTIONS requests
            Write-Host "ℹ️ The endpoint didn't respond to an HTTP OPTIONS request, but that's expected for some OTLP implementations" -ForegroundColor Yellow
        }
        
        # Print the environment variable so it can be used in the Node.js app
        Write-Host ""
        Write-Host "Node.js Configuration" -ForegroundColor Cyan
        Write-Host "===================" -ForegroundColor Cyan        Write-Host "Add this to your .otelenv file or set as environment variable:" -ForegroundColor White
        Write-Host "OTEL_EXPORTER_OTLP_ENDPOINT=$otlpEndpoint" -ForegroundColor Green
        Write-Host ""
        Write-Host "If you're using the NodeJsExtensions.WithNodeTelemetry method, it should set this automatically." -ForegroundColor White
    } else {
        Write-Host "❌ Failed to connect to $hostname on port $port" -ForegroundColor Red
        if ($client.Connected) { $client.Close() }
    }
} catch {
    $errorMessage = $_.Exception.Message
    Write-Host "❌ Error connecting to $hostname on port $port" -ForegroundColor Red
    Write-Host "   Error details: $errorMessage" -ForegroundColor Red
}
