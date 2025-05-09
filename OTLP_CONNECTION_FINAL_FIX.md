# OTLP Connection Fixes for Node.js with .NET Aspire

This document explains the fixes we've made to solve the OpenTelemetry (OTLP) connection issues between Node.js applications and the .NET Aspire dashboard.

## Issue Summary

The Node.js applications (NodeFortuneApi and NodeFortuneSpa) were encountering errors when trying to connect to the Aspire dashboard's OTLP endpoint:

- `Error: PeriodicExportingMetricReader: metrics export failed (error OTLPExporterError: Bad Request)`
- `AggregateError [ECONNREFUSED]` errors when connecting to port 18890
- HTTP/2 over TLS negotiation failures

## Root Causes

1. **Incorrect OTLP Protocol Configuration**: The Node.js OTLP exporter was configured with a URL pattern that included `/v1/traces` which isn't needed when specifying the base endpoint.
2. **Protocol Mismatch**: HTTP/2 was being used but HTTP/1.1 was required or vice versa depending on configuration.
3. **TLS Validation Issues**: Certificate validation was causing connection problems in development environment.
4. **Port Availability**: The OTLP endpoints weren't being properly exposed on the correct ports.

## Solutions Applied

### 1. Dashboard Configuration

Updated `appsettings.json` and `appsettings.Development.json` to configure the Aspire dashboard with explicit HTTP/1 settings:

```json
"Dashboard": {
  "AllowAnonymous": true,
  "UseHttpsRedirection": false,
  "EnableResourceUrlTLS": false,
  "Otlp": {
    "Enabled": true,
    "EnableRuntimeInstrumentation": true,
    "Protocols": [ "HttpProtobuf" ],
    "Http": {
      "Enabled": true,
      "Port": 18890,
      "Scheme": "http",
      "BaseAddress": "http://localhost:18890",
      "Protocols": "Http1"
    }
  }
}
```

### 2. Node.js Application Configuration

Updated `Program.cs` to configure the Node.js applications with correct OpenTelemetry settings:

```csharp
.WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:18890")
.WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")
.WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0")
.WithEnvironment("ASPIRE_ALLOW_UNSECURED_TRANSPORT", "true")
```

### 3. Node.js OpenTelemetry Implementation

Updated the tracing implementation to use HTTP/1.1 with correct content types:

```typescript
const traceExporter = new OTLPTraceExporter({
  url: `${otlpHttpEndpoint}/v1/traces`,
  headers: {
    'Content-Type': 'application/x-protobuf',
  },
  concurrencyLimit: 10,
  timeoutMillis: 30000,
});
```

### 4. Environment Variables

Set the following environment variables:

- `ASPIRE_ALLOW_UNSECURED_TRANSPORT=true`: Allows unsecured connections in development
- `NODE_TLS_REJECT_UNAUTHORIZED=0`: Bypasses TLS certificate validation for development
- `DOTNET_SYSTEM_NET_HTTP_SOCKETSHTTPHANDLER_HTTP2UNENCRYPTEDSUPPORT=true`: Enables HTTP/2 over unencrypted connections

## Validation

Created a test script (`test-otlp-connection-updated.ps1`) to verify connectivity:

1. Tests TCP connection to port 18890 (HTTP OTLP endpoint)
2. Tests TCP connection to port 15089 (Aspire Dashboard)
3. Displays relevant environment variables for troubleshooting

## Remaining Considerations

1. **Security**: The TLS validation bypass (`NODE_TLS_REJECT_UNAUTHORIZED=0`) should only be used in development, never in production.
2. **Protocol Support**: Using HTTP/1.1 instead of HTTP/2 might have performance implications for high-volume telemetry data.
3. **Port Conflicts**: Ensure no other services are using ports 18890, 4317, or 15089.

## Next Steps

1. Monitor the OTLP endpoint connectivity during application usage
2. Consider implementing retry mechanisms for better resilience
3. Configure proper TLS certificates for production use
