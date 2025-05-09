# Test script for the updated HTTP/2 enhanced tracer

Write-Host "Testing the enhanced HTTP/2 tracer..."

# Define environment variables
$env:OTEL_EXPORTER_OTLP_ENDPOINT = "http://127.0.0.1:4317"  # gRPC endpoint
$env:OTEL_EXPORTER_OTLP_HTTP_ENDPOINT = "http://127.0.0.1:18890"  # HTTP endpoint (not working)
$env:OTEL_EXPORTER_OTLP_PROTOCOL = "grpc"  # Force gRPC protocol
$env:OTEL_EXPORTER_OTLP_INSECURE = "true"  # Allow insecure connections
$env:OTEL_SERVICE_NAME = "test-service"
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"  # Disable TLS certificate validation
$env:OTEL_LOG_LEVEL = "debug"

# First, test the ports to see what's available
Write-Host "Testing OTLP ports availability..."

# Test HTTP OTLP port (18890)
try {
    $result = Test-NetConnection -ComputerName localhost -Port 18890 -ErrorAction Stop -InformationLevel Quiet
    if ($result) {
        Write-Host "✅ HTTP OTLP port 18890 is OPEN"
    } else {
        Write-Host "❌ HTTP OTLP port 18890 is CLOSED"
    }
} catch {
    Write-Host "❌ HTTP OTLP port 18890 is CLOSED or error occurred: $_"
}

# Test gRPC OTLP port (4317)
try {
    $result = Test-NetConnection -ComputerName localhost -Port 4317 -ErrorAction Stop -InformationLevel Quiet
    if ($result) {
        Write-Host "✅ gRPC OTLP port 4317 is OPEN"
    } else {
        Write-Host "❌ gRPC OTLP port 4317 is CLOSED"
    }
} catch {
    Write-Host "❌ gRPC OTLP port 4317 is CLOSED or error occurred: $_"
}

# Attempt to create a minimal test script that uses our enhanced tracer
$tempScriptPath = Join-Path $env:TEMP "test-tracer.js"

@"
// Test script for our HTTP/2 enhanced tracer
const tracer = require('./NodeFortuneSpa/tracing-http2-enhanced.js');
console.log('Tracer loaded successfully');

// Create a span
const { trace } = require('@opentelemetry/api');
const tracer2 = trace.getTracer('test-tracer');

// Create a span and add some events
const span = tracer2.startSpan('test-span');
span.addEvent('test-event');
span.setAttribute('test-attribute', 'test-value');

// Wait for 5 seconds to give the exporter time to send the data
setTimeout(() => {
  span.end();
  console.log('Span ended');
  
  // Wait for another 5 seconds to give the exporter time to send the data
  setTimeout(() => {
    console.log('Test completed');
    process.exit(0);
  }, 5000);
}, 5000);
"@ | Out-File -FilePath $tempScriptPath -Encoding utf8

# Run the test script
Write-Host "Running test script..."
try {
    Set-Location (Split-Path -Parent (Resolve-Path "c:\github\ai-app-starter-aspire\NodeFortuneSpa\tracing-http2-enhanced.js"))
    node $tempScriptPath
    Write-Host "Test script completed."
} catch {
    Write-Host "Error running test script: $_"
}

# Clean up
Remove-Item $tempScriptPath -Force
Write-Host "Test completed."
