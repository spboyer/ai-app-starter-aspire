# Troubleshooting OpenTelemetry Integration with Aspire Dashboard

This document provides solutions for common issues when sending OpenTelemetry data from Node.js applications to the .NET Aspire dashboard.

## Key Issues Fixed

1. **Incorrect URL Format for OTLP Exporters** - The OpenTelemetry exporters expect base URLs without the `/v1/traces` or `/v1/metrics` path segments
2. **Protocol Specification** - Added explicit protocol specification using the OTEL_EXPORTER_OTLP_PROTOCOL environment variable
3. **Dynamic Protocol Detection** - Added code to detect and use the same protocol (http/https) as provided in the environment variables

## OTLP Endpoint Format

The most common issue with OpenTelemetry and Aspire dashboard integration is the URL format. The OpenTelemetry SDK will append the path segments for you:

❌ **Incorrect**: `http://localhost:4317/v1/traces`
✅ **Correct**: `http://localhost:4317`

## Fixed Implementation

### 1. Proper Endpoint Configuration

```typescript
// IMPORTANT: The OTLP exporter expects the base URL without /v1/traces
const traceExporterUrl = otlpEndpoint;
console.log('Trace exporter URL:', traceExporterUrl);

const traceExporter = new OTLPTraceExporter({
  url: traceExporterUrl,
  headers: {},
  concurrencyLimit: 10,
  timeoutMillis: 15000,
});
```

### 2. Protocol Detection

```typescript
// Extract the protocol (http or https) from the endpoints
let protocol = 'http:';
try {
  const endpointUrl = new URL(otlpEndpoint);
  protocol = endpointUrl.protocol;
} catch (e) {
  console.error('Failed to parse OTLP endpoint URL:', e);
}
console.log('Protocol detected:', protocol);
```

### 3. AppHost Configuration

```csharp
var app = builder.AddNpmApp("appname", appPath, "start")
    .WithEnvironment("OTEL_SERVICE_NAME", "servicename")
    
    // Use the proper OTLP endpoint format for Aspire dashboard
    // Remove the /v1/traces path from the endpoint, the SDK will add it
    .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", builder.Configuration["DOTNET_DASHBOARD_OTLP_ENDPOINT_URL"] ?? "http://localhost:4317")
    .WithEnvironment("OTEL_EXPORTER_OTLP_HTTP_ENDPOINT", builder.Configuration["ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL"] ?? "http://localhost:18890")
    .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc")
    .WithOtlpExporter();
```

## Default Aspire Dashboard Endpoints

In Aspire, these are the typical endpoint URLs:

- **gRPC Protocol**: `http://localhost:19290` or `https://localhost:21034` (secure)
- **HTTP Protocol**: `http://localhost:18890` or `https://localhost:18890` (secure)

## Verifying Success

1. Look for these log messages in the console:
   - "Trace exporter URL: http://localhost:19290"
   - "Metric exporter URL: http://localhost:18890"
   - "✅ OpenTelemetry SDK initialized successfully"

2. Check the Aspire dashboard at `http://localhost:18888` (typically) and verify:
   - Service resources are visible
   - Telemetry data appears in the Logs and Traces sections

3. Generate some traffic to the application to ensure telemetry is being collected

## Common Errors

- **"gRPC error: connect ECONNREFUSED"**: Your application can't connect to the Aspire dashboard's OTLP endpoint
- **"Cannot read property 'then' of void"**: TypeScript errors in SDK initialization
- **No telemetry showing in dashboard**: Check if your application is correctly formatting the OTLP endpoint URLs

## References

- [Aspire Dashboard Configuration Documentation](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/dashboard/configuration)
- [Aspire Dashboard Overview](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/dashboard/overview)
- [OpenTelemetry Protocol Specification](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/otlp.md)
