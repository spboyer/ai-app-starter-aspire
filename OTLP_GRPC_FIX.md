# OpenTelemetry Integration Fix for Node.js in Aspire

This document explains the fix applied to resolve the OpenTelemetry connection issues with Aspire in Node.js services.

## Problem

The Node.js services (NodeFortuneApi and NodeFortuneSpa) were encountering connection errors when trying to send telemetry data to the OTLP endpoint:

```
Error: PeriodicExportingMetricReader: metrics export failed (error Error: connect ECONNREFUSED 127.0.0.1:18890)
```

The issue was that the services were trying to connect to the HTTP OTLP endpoint (port 18890) which was not available, while the gRPC endpoint (port 4317) was working correctly.

Additionally, even when attempting to use the gRPC endpoint, there were protocol configuration issues causing "Bad Request" errors:

```
{"stack":"OTLPExporterError: Bad Request", "message":"Bad Request", "code":"400", "name":"OTLPExporterError", "data":"An HTTP/1.x request was sent to an HTTP/2 only endpoint."}
```

## Solution

The fix included several key changes:

1. **Configure services to use only gRPC endpoint**
   - Removed HTTP session creation
   - Set both trace and metric exporters to use gRPC endpoint (port 4317)
   - Added proper path components (`/v1/traces` and `/v1/metrics`)
   - Set correct content type headers (`application/x-protobuf`)

2. **Remove HTTP connection attempts and tests**
   - Eliminated connection attempts to port 18890
   - Removed HTTP connection tests in the initialization phase
   - Simplified the shutdown process to only clean up gRPC connections

3. **Simplified error handling**
   - Added better logging for connection issues
   - Ensured proper HTTP/2 protocol compatibility

## Files Modified

- `NodeFortuneApi/src/tracing-http2-enhanced.ts`
- `NodeFortuneSpa/tracing-http2-enhanced.js`

## Configuration Details

The key configuration updates in the tracing files:

```javascript
// Trace exporter configuration
traceExporter = new OTLPTraceExporter({
  url: `${otlpGrpcEndpoint}/v1/traces`,  // Add the path component 
  headers: {
    'Content-Type': 'application/x-protobuf' // Specify the correct content type for gRPC
  },
  timeoutMillis: 30000,
  concurrencyLimit: 10
});

// Metrics exporter configuration
metricExporter = new OTLPMetricExporter({
  url: `${otlpGrpcEndpoint}/v1/metrics`,  // Add the path component
  headers: {
    'Content-Type': 'application/x-protobuf' // Specify the correct content type for gRPC
  },
  timeoutMillis: 30000,
  concurrencyLimit: 10
});
```

## Verification

You can verify that the fix works by:

1. Running the Aspire application
2. Using the `verify-enhanced-otlp.ps1` script to check connections
3. Confirming no more ECONNREFUSED errors appear in the logs
4. Checking that telemetry data appears in the Aspire Dashboard

## Important Notes

- The gRPC port 4317 must be available for this solution to work
- If the Aspire configuration changes, the Node.js services might need to be updated
- Both trace and metric data are now sent over gRPC instead of using separate protocols

## Additional Resources

- [OpenTelemetry Node.js SDK Documentation](https://opentelemetry.io/docs/instrumentation/js/)
- [OTLP Exporter Documentation](https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-proto)
- [Aspire OpenTelemetry Integration](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/telemetry)

## Troubleshooting

If you encounter issues after applying these fixes:

1. Ensure the Aspire application is running
2. Verify that port 4317 is open and accessible
3. Check the logs for any new error messages
4. Try restarting the Node.js services

---

Created: May 9, 2025
