# Test OTLP connection for both HTTP and gRPC endpoints
Write-Host "Testing OTLP connection..."

# Check if HTTP OTLP port is open
Write-Host "`nTesting HTTP OTLP Endpoint (port 18890):"
try {
    $tcpConnection = New-Object System.Net.Sockets.TcpClient
    $connectionResult = $tcpConnection.BeginConnect("localhost", 18890, $null, $null)
    $waitResult = $connectionResult.AsyncWaitHandle.WaitOne(1000, $false)
    
    if ($waitResult -and $tcpConnection.Connected) {
        Write-Host "✅ TCP Connection to port 18890 successful" -ForegroundColor Green
        
        # Test HTTP endpoint with a simple GET request
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:18890/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
            Write-Host "✅ HTTP request to port 18890 successful: $($response.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "❌ HTTP request to port 18890 failed: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ TCP Connection to port 18890 failed" -ForegroundColor Red
    }
    $tcpConnection.Close()
} catch {
    Write-Host "❌ Error testing port 18890: $_" -ForegroundColor Red
}

# Check if gRPC OTLP port is open
Write-Host "`nTesting gRPC OTLP Endpoint (port 4317):"
try {
    $tcpConnection = New-Object System.Net.Sockets.TcpClient
    $connectionResult = $tcpConnection.BeginConnect("localhost", 4317, $null, $null)
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

# Check if Aspire Dashboard port is open
Write-Host "`nTesting Aspire Dashboard (port 15089):"
try {
    $tcpConnection = New-Object System.Net.Sockets.TcpClient
    $connectionResult = $tcpConnection.BeginConnect("localhost", 15089, $null, $null)
    $waitResult = $connectionResult.AsyncWaitHandle.WaitOne(1000, $false)
    
    if ($waitResult -and $tcpConnection.Connected) {
        Write-Host "✅ TCP Connection to port 15089 successful" -ForegroundColor Green
        
        # Test HTTP endpoint with a simple GET request
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:15089" -Method GET -TimeoutSec 2 -ErrorAction Stop
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
