# Test OTLP HTTP/2 connection comprehensively
Write-Host "`n🔍 Testing OTLP HTTP/2 connection...`n" -ForegroundColor Cyan

# Check if HTTP OTLP port is open
Write-Host "Testing HTTP OTLP Endpoint (port 18890):" -ForegroundColor Cyan
try {
    $tcpConnection = New-Object System.Net.Sockets.TcpClient
    $connectionResult = $tcpConnection.BeginConnect("localhost", 18890, $null, $null)
    $waitResult = $connectionResult.AsyncWaitHandle.WaitOne(1000, $false)
    
    if ($waitResult -and $tcpConnection.Connected) {
        Write-Host "✅ TCP Connection to port 18890 successful" -ForegroundColor Green
    } else {
        Write-Host "❌ TCP Connection to port 18890 failed" -ForegroundColor Red
    }
    $tcpConnection.Close()
} catch {
    Write-Host "❌ Error testing port 18890: $_" -ForegroundColor Red
}

# Check if gRPC OTLP port is open
Write-Host "`nTesting gRPC OTLP Endpoint (port 4317):" -ForegroundColor Cyan
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
Write-Host "`nTesting Aspire Dashboard (port 15089):" -ForegroundColor Cyan
try {
    $tcpConnection = New-Object System.Net.Sockets.TcpClient
    $connectionResult = $tcpConnection.BeginConnect("localhost", 15089, $null, $null)
    $waitResult = $connectionResult.AsyncWaitHandle.WaitOne(1000, $false)
    
    if ($waitResult -and $tcpConnection.Connected) {
        Write-Host "✅ TCP Connection to port 15089 successful" -ForegroundColor Green
    } else {
        Write-Host "❌ TCP Connection to port 15089 failed" -ForegroundColor Red
    }
    $tcpConnection.Close()
} catch {
    Write-Host "❌ Error testing port 15089: $_" -ForegroundColor Red
}

# Check critical environment variables
Write-Host "`n📋 Checking Critical Environment Variables:" -ForegroundColor Cyan
$criticalVars = @(
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "OTEL_EXPORTER_OTLP_HTTP_ENDPOINT",
    "OTEL_EXPORTER_OTLP_PROTOCOL",
    "NODE_TLS_REJECT_UNAUTHORIZED",
    "ASPIRE_ALLOW_UNSECURED_TRANSPORT",
    "DOTNET_SYSTEM_NET_HTTP_SOCKETSHTTPHANDLER_HTTP2UNENCRYPTEDSUPPORT",
    "OTEL_EXPORTER_OTLP_INSECURE",
    "DOTNET_ASPIRE_DASHBOARD_OTLP_GRPC_ENABLED",
    "APPLICATIONINSIGHTS_CONNECTION_STRING",
    "AZURE_MONITOR_TRACE_EXPORTER_ENABLED"
)

foreach ($var in $criticalVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ($value) {
        Write-Host "$var=$value" -ForegroundColor Green
    } else {
        Write-Host "$var=<not set>" -ForegroundColor Yellow
    }
}

# Setup the correct environment variables if not set
Write-Host "`n🛠️ Setting required environment variables..." -ForegroundColor Cyan
if (-not [Environment]::GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT")) {
    [Environment]::SetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:4317", "Process")
    Write-Host "✅ Set OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4317" -ForegroundColor Green
}

if (-not [Environment]::GetEnvironmentVariable("OTEL_EXPORTER_OTLP_HTTP_ENDPOINT")) {
    [Environment]::SetEnvironmentVariable("OTEL_EXPORTER_OTLP_HTTP_ENDPOINT", "http://127.0.0.1:18890", "Process")
    Write-Host "✅ Set OTEL_EXPORTER_OTLP_HTTP_ENDPOINT=http://127.0.0.1:18890" -ForegroundColor Green
}

if (-not [Environment]::GetEnvironmentVariable("OTEL_EXPORTER_OTLP_PROTOCOL")) {
    [Environment]::SetEnvironmentVariable("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc", "Process")
    Write-Host "✅ Set OTEL_EXPORTER_OTLP_PROTOCOL=grpc" -ForegroundColor Green
}

if (-not [Environment]::GetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED")) {
    [Environment]::SetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED", "0", "Process")
    Write-Host "✅ Set NODE_TLS_REJECT_UNAUTHORIZED=0" -ForegroundColor Green
}

if (-not [Environment]::GetEnvironmentVariable("ASPIRE_ALLOW_UNSECURED_TRANSPORT")) {
    [Environment]::SetEnvironmentVariable("ASPIRE_ALLOW_UNSECURED_TRANSPORT", "true", "Process")
    Write-Host "✅ Set ASPIRE_ALLOW_UNSECURED_TRANSPORT=true" -ForegroundColor Green
}

if (-not [Environment]::GetEnvironmentVariable("DOTNET_SYSTEM_NET_HTTP_SOCKETSHTTPHANDLER_HTTP2UNENCRYPTEDSUPPORT")) {
    [Environment]::SetEnvironmentVariable("DOTNET_SYSTEM_NET_HTTP_SOCKETSHTTPHANDLER_HTTP2UNENCRYPTEDSUPPORT", "true", "Process")
    Write-Host "✅ Set DOTNET_SYSTEM_NET_HTTP_SOCKETSHTTPHANDLER_HTTP2UNENCRYPTEDSUPPORT=true" -ForegroundColor Green
}

if (-not [Environment]::GetEnvironmentVariable("OTEL_EXPORTER_OTLP_INSECURE")) {
    [Environment]::SetEnvironmentVariable("OTEL_EXPORTER_OTLP_INSECURE", "true", "Process")
    Write-Host "✅ Set OTEL_EXPORTER_OTLP_INSECURE=true" -ForegroundColor Green
}

if (-not [Environment]::GetEnvironmentVariable("DOTNET_ASPIRE_DASHBOARD_OTLP_GRPC_ENABLED")) {
    [Environment]::SetEnvironmentVariable("DOTNET_ASPIRE_DASHBOARD_OTLP_GRPC_ENABLED", "true", "Process")
    Write-Host "✅ Set DOTNET_ASPIRE_DASHBOARD_OTLP_GRPC_ENABLED=true" -ForegroundColor Green
}

# Provide instructions
Write-Host "`n📌 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Run the application: " -NoNewline
Write-Host "dotnet run --project .\ai-app-starter-aspire.AppHost\ai-app-starter-aspire.AppHost.csproj --launch-profile http" -ForegroundColor Yellow
Write-Host "2. Check the logs for successful HTTP/2 connections"
Write-Host "3. Verify telemetry appears in the Aspire dashboard"
Write-Host "`nNote: HTTP/2 connections might take a few moments to establish and send telemetry data.`n" -ForegroundColor Yellow
