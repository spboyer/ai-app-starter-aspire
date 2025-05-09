# Fix OTLP Connection Issues in Node.js Applications with Aspire

# Set environment variables for easier troubleshooting
$env:OTEL_LOG_LEVEL = "debug"
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
$env:ASPIRE_ALLOW_UNSECURED_TRANSPORT = "true"

# 1. Ensure OTLP ports are not being used by other processes
Write-Host "Step 1: Checking if OTLP ports are already in use..." -ForegroundColor Cyan
$ports = @(18890, 4317, 15089)
foreach ($port in $ports) {
    $inUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($inUse) {
        Write-Host "Port $port is in use by PID: $($inUse.OwningProcess)" -ForegroundColor Yellow
        $process = Get-Process -Id $inUse.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "  Process name: $($process.ProcessName)" -ForegroundColor Yellow
            $response = Read-Host "Do you want to kill this process? (y/n)"
            if ($response -eq 'y') {
                Stop-Process -Id $inUse.OwningProcess -Force
                Write-Host "  Process killed" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "Port $port is available" -ForegroundColor Green
    }
}

# 2. Create a test script to verify the dashboard is accepting OTLP connections
Write-Host "`nStep 2: Creating connection test script..." -ForegroundColor Cyan
$testScriptPath = Join-Path $PSScriptRoot "test-otlp-connection-updated.ps1"
$testScriptContent = @'
# Test OTLP connection using plain TCP and HTTP requests
Write-Host "Testing OTLP connection to Aspire Dashboard..." -ForegroundColor Cyan

# Test HTTP OTLP endpoint (port 18890)
Write-Host "`nTesting HTTP OTLP Endpoint (port 18890):"
try {
    $tcpConnection = New-Object System.Net.Sockets.TcpClient
    $connectionResult = $tcpConnection.BeginConnect("127.0.0.1", 18890, $null, $null)
    $waitResult = $connectionResult.AsyncWaitHandle.WaitOne(1000, $false)
    
    if ($waitResult -and $tcpConnection.Connected) {
        Write-Host "✅ TCP Connection to port 18890 successful" -ForegroundColor Green
        
        # Test HTTP endpoint with a simple GET request
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:18890/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
            Write-Host "✅ HTTP request to port 18890 successful: $($response.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "❌ HTTP request to port 18890 failed: $_" -ForegroundColor Red
            Write-Host "This may be normal if the endpoint doesn't have a /health path"
        }
    } else {
        Write-Host "❌ TCP Connection to port 18890 failed" -ForegroundColor Red
    }
    $tcpConnection.Close()
} catch {
    Write-Host "❌ Error testing port 18890: $_" -ForegroundColor Red
}

# Test Dashboard endpoint (port 15089)
Write-Host "`nTesting Aspire Dashboard (port 15089):"
try {
    $tcpConnection = New-Object System.Net.Sockets.TcpClient
    $connectionResult = $tcpConnection.BeginConnect("127.0.0.1", 15089, $null, $null)
    $waitResult = $connectionResult.AsyncWaitHandle.WaitOne(1000, $false)
    
    if ($waitResult -and $tcpConnection.Connected) {
        Write-Host "✅ TCP Connection to port 15089 successful" -ForegroundColor Green
        
        # Test HTTP endpoint with a simple GET request
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:15089" -Method GET -TimeoutSec 2 -ErrorAction Stop
            Write-Host "✅ HTTP request to dashboard successful: $($response.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "❌ HTTP request to dashboard failed: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ TCP Connection to port 15089 failed" -ForegroundColor Red
    }
    $tcpConnection.Close()
} catch {
    Write-Host "❌ Error testing port 15089: $_" -ForegroundColor Red
}

# Print environment variables for troubleshooting
Write-Host "`nEnvironment Variables:"
Write-Host "OTEL_EXPORTER_OTLP_ENDPOINT=$env:OTEL_EXPORTER_OTLP_ENDPOINT"
Write-Host "OTEL_EXPORTER_OTLP_PROTOCOL=$env:OTEL_EXPORTER_OTLP_PROTOCOL"
Write-Host "ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL=$env:ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL"
Write-Host "NODE_TLS_REJECT_UNAUTHORIZED=$env:NODE_TLS_REJECT_UNAUTHORIZED" 
Write-Host "ASPIRE_ALLOW_UNSECURED_TRANSPORT=$env:ASPIRE_ALLOW_UNSECURED_TRANSPORT"
'@
Set-Content -Path $testScriptPath -Value $testScriptContent
Write-Host "Created connection test script at $testScriptPath" -ForegroundColor Green

# 3. Start the application with correct configuration
Write-Host "`nStep 3: Starting the application with updated configuration..." -ForegroundColor Cyan
& dotnet run --project .\ai-app-starter-aspire.AppHost\ai-app-starter-aspire.AppHost.csproj --launch-profile http

# Note: At this point, the application should be running and you can check if the connection issues are resolved
Write-Host "`nApplication started. Check if the OTLP connection issues are resolved." -ForegroundColor Cyan
Write-Host "You can run the connection test script with: & $testScriptPath" -ForegroundColor Yellow
