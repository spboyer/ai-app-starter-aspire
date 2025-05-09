# Troubleshooting Node.js OpenTelemetry Integration with Aspire

This document summarizes our findings from attempting to integrate Node.js applications with .NET Aspire's OpenTelemetry system, with a specific focus on making it compatible with the NextJS approach.

## Connection Issues Observed

When running our Node.js applications with OpenTelemetry integration, we observed the following connection issues:

1. **Self-signed certificate errors**:
   ```
   Error: self-signed certificate; if the root CA is installed locally, try running Node.js with --use-system-ca
   code: 'DEPTH_ZERO_SELF_SIGNED_CERT'
   ```

2. **Socket hang-up errors**:
   ```
   Error: PeriodicExportingMetricReader: metrics export failed (error Error: socket hang up)
   code: 'ECONNRESET'
   ```

## Root Causes

Based on our investigation and the GitHub discussion thread, these issues stem from several causes:

1. **HTTPS/TLS Issues**: Aspire uses HTTPS endpoints with self-signed certificates in development mode.

2. **Protocol Mismatches**: The OpenTelemetry JavaScript SDK requires specific configurations for different protocols (gRPC vs HTTP).

3. **URL Format Requirements**: The URL format for OpenTelemetry exporters differs between gRPC and HTTP protocols.

4. **Content Type Headers**: HTTP protocol requires specific content type headers that weren't initially set.

## Implemented Solutions

We've implemented the following solutions:

1. **Disabled Certificate Validation** (for development only):
   ```csharp
   .WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0")
   ```

2. **Protocol-Aware Configuration**:
   ```javascript
   if (otlpProtocol === 'grpc') {
     // IMPORTANT: For gRPC, use the base URL without /v1/traces
     traceExporter = new OTLPTraceExporter({
       url: otlpEndpoint, // Base URL without /v1/traces
       // ...
     });
   }
   else if (otlpProtocol === 'http/protobuf') {
     // For HTTP protocol, append /v1/traces to the endpoint URL
     traceExporter = new OTLPTraceExporter({
       url: `${otlpHttpEndpoint}/v1/traces`,
       headers: {
         'Content-Type': 'application/x-protobuf', // Required for HTTP protocol
       },
       // ...
     });
   }
   ```

3. **Enhanced Error Handling and Logging**:
   ```javascript
   // Enable debug logging
   .WithEnvironment("OTEL_LOG_LEVEL", "debug")
   ```

4. **Fixed TypeScript Errors**:
   Removed unsupported `logLevel` configuration property that was causing build failures.

5. **CORS Configuration** for browser telemetry in `appsettings.json`:
   ```json
   "Dashboard": {
     "Otlp": {
       "Cors": {
         "AllowedOrigins": "*",
         "AllowedHeaders": "*"
       }
     }
   }
   ```

## Ongoing Issues

Despite these solutions, we still encounter connection issues:

1. **Socket hang-up errors**: These may indicate intermittent connectivity problems, possibly due to:
   - Network timeouts
   - Load balancing issues
   - Configuration incompatibilities between the Node.js OpenTelemetry SDK and Aspire's collector

2. **Metrics export failures**: These might be due to:
   - Protocol incompatibilities specific to metrics
   - Backend collector configuration issues

## Next Steps and Recommendations

1. **Try Alternative Protocol**: If gRPC is causing issues, switch to HTTP protocol and vice versa:
   ```csharp
   .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")
   ```

2. **Increase Timeout Values**:
   ```javascript
   timeoutMillis: 30000, // Increase from 15000 to 30000
   ```

3. **Test with Minimal Configuration**: Create a minimal test app that only sends traces but not metrics to isolate issues.

4. **Check Network Configuration**: Ensure ports are accessible and not blocked by firewalls or proxies.

5. **Try Local OpenTelemetry Collector**: Set up a standalone OpenTelemetry collector for testing, rather than relying on Aspire's built-in collector.

6. **For Production Environments**:
   - Ensure proper certificate validation (remove `NODE_TLS_REJECT_UNAUTHORIZED=0`)
   - Implement proper retry and backoff logic
   - Consider using OpenTelemetry exporters with built-in resilience features

## Alternative Approaches

If direct integration continues to be problematic, consider alternative approaches:

1. **Use Application Insights JavaScript SDK**: This offers a different approach to telemetry collection that might be more robust for browser applications.

2. **Implement a Custom Telemetry Gateway**: Develop a simple .NET application to receive telemetry from Node.js applications and forward it to Aspire's collector.

3. **Log to Files and Process Later**: For non-real-time scenarios, log telemetry data to files and process them as a batch operation.

## Conclusion

Integrating Node.js applications with Aspire's OpenTelemetry system involves several technical challenges related to protocols, TLS configuration, and proper URL formatting. While our solutions address many of these challenges, some connection issues persist that might require environment-specific troubleshooting.

We've created a more compatible implementation based on the NextJS approach, but there may still be environment-specific factors affecting the connection reliability. Testing each component in isolation and gradually building up the full integration might help identify the precise source of the remaining issues.
