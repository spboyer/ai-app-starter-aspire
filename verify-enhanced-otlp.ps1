# Enhanced verification script for OpenTelemetry gRPC connections

Write-Host "🔄 Testing OpenTelemetry with enhanced gRPC configuration..." -ForegroundColor Cyan

# Define the environment variables
$env:OTEL_EXPORTER_OTLP_ENDPOINT = "http://127.0.0.1:4317"  # gRPC endpoint
$env:OTEL_EXPORTER_OTLP_HTTP_ENDPOINT = "http://127.0.0.1:18890"  # HTTP endpoint (not available)
$env:OTEL_EXPORTER_OTLP_PROTOCOL = "grpc"  # Force gRPC protocol
$env:OTEL_EXPORTER_OTLP_INSECURE = "true"  # Allow insecure connections
$env:OTEL_SERVICE_NAME = "test-service"
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"  # Disable TLS certificate validation
$env:OTEL_LOG_LEVEL = "debug"

# Check if the Aspire dashboard is running
Write-Host "📊 Checking if Aspire Dashboard is running..." -ForegroundColor Cyan
$dashboardResult = Test-NetConnection -ComputerName localhost -Port 15089 -ErrorAction SilentlyContinue -InformationLevel Quiet
if ($dashboardResult) {
    Write-Host "✅ Aspire Dashboard (port 15089) is running" -ForegroundColor Green
} else {
    Write-Host "❌ Aspire Dashboard (port 15089) is NOT running. Please start your Aspire application." -ForegroundColor Red
}

# Check if the gRPC OTLP endpoint is available
Write-Host "🔌 Testing if the gRPC port 4317 is available..." -ForegroundColor Cyan
$grpcResult = Test-NetConnection -ComputerName localhost -Port 4317 -ErrorAction SilentlyContinue -InformationLevel Quiet
if ($grpcResult) {
    Write-Host "✅ gRPC port 4317 is available" -ForegroundColor Green
} else {
    Write-Host "❌ gRPC port 4317 is NOT available. Make sure your Aspire application is running." -ForegroundColor Red
}

# Check if the HTTP OTLP endpoint is available (should NOT be used anymore)
Write-Host "🔌 Testing if the HTTP port 18890 is available..." -ForegroundColor Cyan
$httpResult = Test-NetConnection -ComputerName localhost -Port 18890 -ErrorAction SilentlyContinue -InformationLevel Quiet
if ($httpResult) {
    Write-Host "ℹ️ HTTP port 18890 is available (but we're not using it)" -ForegroundColor Yellow
} else {
    Write-Host "ℹ️ HTTP port 18890 is NOT available (which is expected - we're using gRPC only)" -ForegroundColor Yellow
}

# Check connections to NodeFortuneApi and NodeFortuneSpa
Write-Host "🔌 Testing connections to Node.js services..." -ForegroundColor Cyan
$apiResult = Test-NetConnection -ComputerName localhost -Port 4000 -ErrorAction SilentlyContinue -InformationLevel Quiet
if ($apiResult) {
    Write-Host "✅ NodeFortuneApi (port 4000) is available" -ForegroundColor Green
} else {
    Write-Host "❌ NodeFortuneApi (port 4000) is NOT available. Make sure it's running." -ForegroundColor Red
}

$spaResult = Test-NetConnection -ComputerName localhost -Port 3000 -ErrorAction SilentlyContinue -InformationLevel Quiet
if ($spaResult) {
    Write-Host "✅ NodeFortuneSpa (port 3000) is available" -ForegroundColor Green
} else {
    Write-Host "❌ NodeFortuneSpa (port 3000) is NOT available. Make sure it's running." -ForegroundColor Red
}

# Test API endpoint to verify functionality
Write-Host "🔄 Testing API endpoint functionality..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/fortunes/random" -ErrorAction SilentlyContinue
    Write-Host "✅ API endpoint is working. Random fortune: $($response.text)" -ForegroundColor Green
} catch {
    Write-Host "❌ Could not connect to API. Error: $_" -ForegroundColor Red
}

# Check for recent ECONNREFUSED errors in logs
Write-Host "🔍 Checking for ECONNREFUSED errors in recent logs..." -ForegroundColor Cyan
$errorCount = 0

# Look for errors in NodeFortuneApi logs
if (Test-Path -Path "c:\github\ai-app-starter-aspire\NodeFortuneApi\*.log") {
    $recentErrors = Get-Content -Path "c:\github\ai-app-starter-aspire\NodeFortuneApi\*.log" -Tail 100 | Select-String -Pattern "ECONNREFUSED"
    if ($recentErrors) {
        Write-Host "⚠️ Found ECONNREFUSED errors in NodeFortuneApi logs:" -ForegroundColor Yellow
        $recentErrors | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        $errorCount++
    }
}

# Look for errors in NodeFortuneSpa logs
if (Test-Path -Path "c:\github\ai-app-starter-aspire\NodeFortuneSpa\*.log") {
    $recentErrors = Get-Content -Path "c:\github\ai-app-starter-aspire\NodeFortuneSpa\*.log" -Tail 100 | Select-String -Pattern "ECONNREFUSED"
    if ($recentErrors) {
        Write-Host "⚠️ Found ECONNREFUSED errors in NodeFortuneSpa logs:" -ForegroundColor Yellow
        $recentErrors | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        $errorCount++
    }
}

# Summary
Write-Host "`n📋 Test Summary:" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Cyan
if ($grpcResult) {
    Write-Host "✅ gRPC endpoint (port 4317) is available" -ForegroundColor Green
} else {
    Write-Host "❌ gRPC endpoint (port 4317) is NOT available" -ForegroundColor Red
}

if ($apiResult -and $spaResult) {
    Write-Host "✅ Node.js services are running" -ForegroundColor Green
} else {
    Write-Host "❌ Some Node.js services are not running" -ForegroundColor Red
}

if ($errorCount -eq 0) {
    Write-Host "✅ No recent ECONNREFUSED errors found in logs" -ForegroundColor Green
    Write-Host "`n🎉 Your OpenTelemetry integration should be working correctly now!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Found ECONNREFUSED errors in logs - may need further investigation" -ForegroundColor Yellow
}

Write-Host "`nℹ️ Note: To see telemetry data, make sure to interact with your application to generate traces and metrics" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Cyan
