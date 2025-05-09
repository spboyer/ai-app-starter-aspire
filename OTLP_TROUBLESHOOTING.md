# OpenTelemetry Connection Troubleshooting Guide

This guide will help you troubleshoot common connection issues between Node.js applications and the .NET Aspire OpenTelemetry collector.

## Common Socket Hang-Up Errors

Socket hang-up errors typically occur when a connection is unexpectedly closed by the server or when there are network issues. Common error messages include:

- `Error: socket hang up`
- `Error: read ECONNRESET`
- `Error: connect ETIMEDOUT`
- `Error: connect ECONNREFUSED`

## Troubleshooting Steps

### 1. Check Basic Connectivity

First, ensure that the Aspire dashboard and collector are running and accessible:

```powershell
# Check if the Aspire dashboard port is open
Test-NetConnection -ComputerName localhost -Port 18888

# Check if the OTLP collector endpoints are accessible
Test-NetConnection -ComputerName localhost -Port 4317 # gRPC
Test-NetConnection -ComputerName localhost -Port 18890 # HTTP
```

### 2. Verify Environment Variables

Make sure the correct environment variables are being set:

```powershell
# Run this in the AppHost project directory
dotnet run -- --environment-names Development -- --project-env NodeFortuneApi:OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

### 3. Switch Between Protocols

Try switching between gRPC and HTTP protocols using the provided script:

```powershell
# Try with HTTP protocol
.\switch-otlp-config.ps1 -Protocol http -DisableTlsValidation -EnableDebugLogging

# Try with gRPC protocol
.\switch-otlp-config.ps1 -Protocol grpc -DisableTlsValidation -EnableDebugLogging
```

### 4. Disable TLS Certificate Validation (Development Only)

For local development, you might need to disable TLS certificate validation:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
```

This can also be set in the AppHost configuration.

### 5. Enable Verbose Logging

Set the OpenTelemetry logging level to debug:

```powershell
$env:OTEL_LOG_LEVEL = "debug"
```

### 6. Check for Network Interference

- Verify that no firewall or antivirus is blocking the connection
- Check if any proxy is interfering with the connection

### 7. Test with Resilient Tracing Implementation

Try using the resilient tracing implementation which includes enhanced error handling:

1. Update your Node.js application to use the resilient tracing:

   For API (in index.ts):
   ```typescript
   import './tracing-resilient';
   ```

   For SPA (in vite.config.ts):
   ```typescript
   import './tracing-resilient.js';
   ```

### 8. Verify CORS Configuration

Ensure CORS is properly configured in the Aspire dashboard:

```json
{
  "Dashboard": {
    "Otlp": {
      "Cors": {
        "AllowedOrigins": "*",
        "AllowedHeaders": "*"
      }
    }
  }
}
```

### 9. Check for Content-Type Headers

When using HTTP protocol, ensure the correct Content-Type headers are set:

```javascript
// For HTTP protocol
traceExporter = new OTLPTraceExporter({
  url: `${otlpHttpEndpoint}/v1/traces`,
  headers: {
    'Content-Type': 'application/x-protobuf', // Required for HTTP protocol
  },
});
```

### 10. Test Direct Connection to Collector

Try sending a manual request to the collector to test connectivity:

```powershell
Invoke-WebRequest -Uri "http://localhost:18890/health" -Method GET
```

## Advanced Troubleshooting

### Analyzing Network Traffic

You can use tools like Wireshark or Fiddler to analyze network traffic:

1. Start capturing traffic on localhost
2. Filter for the collector port (4317 or 18890)
3. Look for errors in the communication

### Increasing Timeouts

If you're experiencing timeouts, try increasing the exporter timeout:

```javascript
traceExporter = new OTLPTraceExporter({
  url: otlpEndpoint,
  timeoutMillis: 60000, // 60 seconds
});
```

### Testing with a Simple Test Script

Create a simple test script to isolate the issue:

```javascript
// test-otlp-connection.js
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');

const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4317', // or the appropriate URL
});

// Create a dummy span
const span = {
  name: 'test-span',
  spanContext: () => ({
    traceId: '00000000000000000000000000000001',
    spanId: '0000000000000001',
    traceFlags: 1,
  }),
  attributes: {},
  startTime: [0, 0],
  endTime: [1, 0],
  status: { code: 0 },
  events: [],
  links: [],
  resource: {
    attributes: {
      'service.name': 'test-service',
    },
  },
};

// Export the span and check for errors
exporter.export([span], (result) => {
  console.log('Export result:', result);
});
```

Run with:
```
node test-otlp-connection.js
```

## Getting Help

If you continue to experience issues, check the following resources:

- [OpenTelemetry Node.js SDK Documentation](https://opentelemetry.io/docs/instrumentation/js/getting-started/nodejs/)
- [.NET Aspire Documentation](https://learn.microsoft.com/en-us/dotnet/aspire/)
- [GitHub Discussion on NextJS OpenTelemetry with Aspire](https://github.com/dotnet/aspire/discussions/5304)
