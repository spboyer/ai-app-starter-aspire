# Test OTLP Connection
# This script checks if the OTLP endpoints are accessible and listening correctly
param(
    [string]$HttpEndpoint = "http://localhost:18890",
    [string]$GrpcEndpoint = "http://localhost:4317"
)

Write-Host "Testing OTLP Connection to Aspire Dashboard" -ForegroundColor Cyan
Write-Host "--------------------------------------" -ForegroundColor Cyan

# Function to test TCP connection to a port
function Test-TcpConnection {
    param (
        [string]$Hostname,
        [int]$Port,
        [string]$Description
    )
    
    Write-Host "Testing connection to $Description ($($Hostname):$Port)..." -NoNewline
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connectionResult = $tcpClient.BeginConnect($Hostname, $Port, $null, $null)
        $waitResult = $connectionResult.AsyncWaitHandle.WaitOne(1000, $false)
        
        if ($waitResult -and $tcpClient.Connected) {
            Write-Host " SUCCESS" -ForegroundColor Green
            $tcpClient.Close()
            return $true
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            $tcpClient.Close()
            return $false
        }
    } catch {
        Write-Host " ERROR: $_" -ForegroundColor Red
        return $false
    }
}

# Function to test HTTP connection
function Test-HttpConnection {
    param (
        [string]$Url,
        [string]$Description
    )
    
    Write-Host "Testing HTTP connection to $Description ($Url)..." -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response -and $response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
            Write-Host " SUCCESS (Status: $($response.StatusCode))" -ForegroundColor Green
            return $true
        } else {
            Write-Host " FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host " ERROR: $_" -ForegroundColor Red
        return $false
    }
}

# Extract hostname and port from the HTTP endpoint
try {
    $httpUri = [System.Uri]$HttpEndpoint
    $httpHost = $httpUri.Host
    $httpPort = $httpUri.Port
} catch {
    Write-Host "Invalid HTTP endpoint URL: $HttpEndpoint" -ForegroundColor Red
    $httpHost = "localhost"
    $httpPort = 18890
}

# Extract hostname and port from the gRPC endpoint
try {
    $grpcUri = [System.Uri]$GrpcEndpoint
    $grpcHost = $grpcUri.Host
    $grpcPort = $grpcUri.Port
} catch {
    Write-Host "Invalid gRPC endpoint URL: $GrpcEndpoint" -ForegroundColor Red
    $grpcHost = "localhost"
    $grpcPort = 4317
}

# Test the connections
Write-Host "`nTesting basic TCP connectivity:"
$httpTcpSuccess = Test-TcpConnection -Hostname $httpHost -Port $httpPort -Description "HTTP OTLP"
$grpcTcpSuccess = Test-TcpConnection -Hostname $grpcHost -Port $grpcPort -Description "gRPC OTLP"

Write-Host "`nTesting HTTP endpoints:"
Test-HttpConnection -Url "$HttpEndpoint/v1/traces" -Description "Traces endpoint"
Test-HttpConnection -Url "$HttpEndpoint/v1/metrics" -Description "Metrics endpoint"
Test-HttpConnection -Url "$HttpEndpoint/health" -Description "Health endpoint"

# Summary
Write-Host "`nOTLP Connection Test Summary:" -ForegroundColor Cyan
Write-Host "--------------------------------------" -ForegroundColor Cyan
if ($httpTcpSuccess) {
    Write-Host "✅ HTTP OTLP endpoint ($HttpEndpoint) is accessible" -ForegroundColor Green
} else {
    Write-Host "❌ HTTP OTLP endpoint ($HttpEndpoint) is NOT accessible" -ForegroundColor Red
    Write-Host "  - Check if the Aspire dashboard is running"
    Write-Host "  - Verify that port $httpPort is not blocked by a firewall"
    Write-Host "  - Ensure the OTLP HTTP protocol is enabled in appsettings.json"
}

if ($grpcTcpSuccess) {
    Write-Host "✅ gRPC OTLP endpoint ($GrpcEndpoint) is accessible" -ForegroundColor Green
} else {
    Write-Host "❌ gRPC OTLP endpoint ($GrpcEndpoint) is NOT accessible" -ForegroundColor Red
    Write-Host "  - Check if the Aspire dashboard is running"
    Write-Host "  - Verify that port $grpcPort is not blocked by a firewall"
    Write-Host "  - Ensure the OTLP gRPC protocol is enabled in appsettings.json"
}

Write-Host "`nSuggestions if connections are failing:" -ForegroundColor Yellow
Write-Host "1. Ensure Aspire Dashboard is running"
Write-Host "2. Check appsettings.json for correct OTLP configuration"
Write-Host "3. Verify that your firewall allows these connections"
Write-Host "4. Try adding 'Enabled: true' to the HTTP and gRPC sections"
Write-Host "5. Check if the BaseAddress settings are configured correctly"
