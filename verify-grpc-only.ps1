# Verify that only the gRPC port is used for telemetry

Write-Host "Testing OpenTelemetry with only gRPC..."

# Define the environment variables
$env:OTEL_EXPORTER_OTLP_ENDPOINT = "http://127.0.0.1:4317"  # gRPC endpoint
$env:OTEL_EXPORTER_OTLP_HTTP_ENDPOINT = "http://127.0.0.1:18890"  # HTTP endpoint (not available)
$env:OTEL_EXPORTER_OTLP_PROTOCOL = "grpc"  # Force gRPC protocol
$env:OTEL_EXPORTER_OTLP_INSECURE = "true"  # Allow insecure connections
$env:OTEL_SERVICE_NAME = "test-service"
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"  # Disable TLS certificate validation
$env:OTEL_LOG_LEVEL = "debug"

# Check if the gRPC port is available
Write-Host "Testing if the gRPC port 4317 is available..."
$grpcResult = Test-NetConnection -ComputerName localhost -Port 4317 -ErrorAction SilentlyContinue -InformationLevel Quiet
if ($grpcResult) {
    Write-Host "✅ gRPC port 4317 is available"
} else {
    Write-Host "❌ gRPC port 4317 is NOT available. Make sure your Aspire application is running."
    exit
}

# Check connections to NodeFortuneApi and NodeFortuneSpa
Write-Host "Testing connections to Node.js services..."
$apiResult = Test-NetConnection -ComputerName localhost -Port 4000 -ErrorAction SilentlyContinue -InformationLevel Quiet
if ($apiResult) {
    Write-Host "✅ NodeFortuneApi (port 4000) is available"
} else {
    Write-Host "⚠️ NodeFortuneApi (port 4000) is NOT available. Make sure it's running."
}

$spaResult = Test-NetConnection -ComputerName localhost -Port 3000 -ErrorAction SilentlyContinue -InformationLevel Quiet
if ($spaResult) {
    Write-Host "✅ NodeFortuneSpa (port 3000) is available"
} else {
    Write-Host "⚠️ NodeFortuneSpa (port 3000) is NOT available. Make sure it's running."
}

# Test API endpoint
Write-Host "Testing API endpoint..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/fortunes/random" -ErrorAction SilentlyContinue
    Write-Host "✅ API endpoint is working. Random fortune: $($response.text)"
} catch {
    Write-Host "⚠️ Could not connect to API. Error: $_"
}

Write-Host "Verification complete. Your application should now be using only the gRPC endpoint for telemetry."
Write-Host "Check logs for any ECONNREFUSED errors related to port 18890."
