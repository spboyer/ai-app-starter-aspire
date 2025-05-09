# Test OTLP HTTP/2 connection
Write-Host "Testing OTLP HTTP/2 connection..." -ForegroundColor Cyan

# Test HTTP OTLP endpoint (port 18890)
Write-Host "`nTesting HTTP OTLP Endpoint (port 18890):"
try {
    $tcpConnection = New-Object System.Net.Sockets.TcpClient
    $connectionResult = $tcpConnection.BeginConnect("127.0.0.1", 18890, $null, $null)
    $waitResult = $connectionResult.AsyncWaitHandle.WaitOne(1000, $false)
    
    if ($waitResult -and $tcpConnection.Connected) {
        Write-Host "✅ TCP Connection to port 18890 successful" -ForegroundColor Green
        
        # Note about HTTP/2 testing
        Write-Host "Note: HTTP/2 connections can't be easily tested with Invoke-WebRequest." -ForegroundColor Yellow
        Write-Host "Check the Node.js application logs for successful HTTP/2 connections." -ForegroundColor Yellow
    } else {
        Write-Host "❌ TCP Connection to port 18890 failed" -ForegroundColor Red
    }
    $tcpConnection.Close()
} catch {
    Write-Host "❌ Error testing port 18890: $_" -ForegroundColor Red
}

# Test gRPC OTLP endpoint (port 4317)
Write-Host "`nTesting gRPC OTLP Endpoint (port 4317):"
try {
    $tcpConnection = New-Object System.Net.Sockets.TcpClient
    $connectionResult = $tcpConnection.BeginConnect("127.0.0.1", 4317, $null, $null)
    $waitResult = $connectionResult.AsyncWaitHandle.WaitOne(1000, $false)
    
    if ($waitResult -and $tcpConnection.Connected) {
        Write-Host "✅ TCP Connection to port 4317 successful" -ForegroundColor Green
    } else {
        Write-Host "❌ TCP Connection to port 4317 failed" -ForegroundColor Red
    }
    $tcpConnection.Close()
} catch {
    Write-Host "❌ Error testing port 4317: $_" -ForegroundColor Red
}

# Test Aspire Dashboard endpoint (port 15089)
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
Write-Host "NODE_TLS_REJECT_UNAUTHORIZED=$env:NODE_TLS_REJECT_UNAUTHORIZED" 
Write-Host "ASPIRE_ALLOW_UNSECURED_TRANSPORT=$env:ASPIRE_ALLOW_UNSECURED_TRANSPORT"
Write-Host "DOTNET_SYSTEM_NET_HTTP_SOCKETSHTTPHANDLER_HTTP2UNENCRYPTEDSUPPORT=$env:DOTNET_SYSTEM_NET_HTTP_SOCKETSHTTPHANDLER_HTTP2UNENCRYPTEDSUPPORT"
