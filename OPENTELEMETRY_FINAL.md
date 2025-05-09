# OpenTelemetry Integration for Node.js Applications in .NET Aspire

This document provides a comprehensive guide for setting up OpenTelemetry in Node.js applications (both server and client-side) within a .NET Aspire project.

## Key Components Fixed

1. **Resource Creation**: Fixed how resources are created in OpenTelemetry
2. **CORS Configuration**: Added CORS support for the Aspire dashboard
3. **HTTP vs gRPC Endpoints**: Configured both protocols properly
4. **Error Handling**: Added robust error handling for initialization
5. **Improved Debugging**: Better logging throughout the telemetry pipeline

## 1. AppHost Configuration

### 1.1 Environment Variables

Your .NET Aspire AppHost's `Program.cs` should set these environment variables for Node.js applications:

```csharp
var nodeApp = builder.AddNpmApp("appname", appPath, "start")
    .WithEnvironment("OTEL_SERVICE_NAME", "yourservicename")
    .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", builder.Configuration["DOTNET_DASHBOARD_OTLP_ENDPOINT_URL"] ?? "http://localhost:4317")
    .WithEnvironment("OTEL_EXPORTER_OTLP_HTTP_ENDPOINT", builder.Configuration["ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL"] ?? "http://localhost:18890")
    .WithOtlpExporter();
```

### 1.2 CORS Configuration

Create or update `appsettings.json` in the AppHost project:

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

### 1.3 LaunchSettings.json

Ensure `launchSettings.json` includes the HTTP endpoint for OTLP:

```json
"environmentVariables": {
  "DOTNET_DASHBOARD_OTLP_ENDPOINT_URL": "http://localhost:19290",
  "ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL": "http://localhost:18890"
}
```

## 2. Node.js API OpenTelemetry Setup

### 2.1 Initialization

```typescript
// Read environment variables
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
const otlpHttpEndpoint = process.env.OTEL_EXPORTER_OTLP_HTTP_ENDPOINT || 'http://localhost:18890';
const serviceName = process.env.OTEL_SERVICE_NAME || 'node-fortune-api';

// Configure trace exporter (gRPC)
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
  headers: {},
  concurrencyLimit: 10,
  timeoutMillis: 15000,
});

// Configure metrics exporter (HTTP)
const metricExporter = new OTLPMetricExporter({
  url: `${otlpHttpEndpoint}/v1/metrics`,
  headers: {},
  concurrencyLimit: 10,
  timeoutMillis: 15000,
});
```

### 2.2 Correct Resource Creation

```typescript
// Create a Resource with proper attributes
const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  'application.type': 'node.js-api',
  'node.version': process.version,
  'deployment.environment': process.env.NODE_ENV || 'development',
});
```

### 2.3 SDK Configuration

```typescript
// Configure the SDK with detailed options
const sdk = new opentelemetry.NodeSDK({
  resource,
  traceExporter,
  metricReader: new opentelemetry.metrics.PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: true },
    }),
  ],
});
```

### 2.4 Safe Initialization

```typescript
// Initialize the SDK and register with the OpenTelemetry API
try {
  sdk.start();
  console.log('✅ OpenTelemetry SDK initialized successfully');
} catch (error: unknown) {
  console.error('❌ Failed to initialize OpenTelemetry:', error);
}
```

## 3. Browser/SPA OpenTelemetry Setup

For client-side/browser applications, similar principles apply but using browser-specific libraries.

## 4. Common Issues and Solutions

### 4.1 No Telemetry in Dashboard

- **Problem**: OpenTelemetry data not appearing in the Aspire dashboard
- **Solution**: 
  1. Ensure CORS is properly configured for browser applications
  2. Use `resourceFromAttributes()` instead of `new Resource()`
  3. Check environment variables are correctly passed
  4. Verify both HTTP and gRPC endpoints are configured

### 4.2 TypeScript Errors

- **Problem**: Errors like "Property 'then' does not exist on type 'void'" 
- **Solution**: Handle SDK start correctly:
```typescript
try {
  // Start the SDK
  const startOperation = sdk.start();
  
  // Some versions return Promise, others void
  if (startOperation && typeof startOperation.then === 'function') {
    startOperation
      .then(() => console.log('✅ OpenTelemetry SDK started successfully'))
      .catch((err: unknown) => console.error('❌ Error starting OpenTelemetry SDK:', err));
  } else {
    console.log('✅ OpenTelemetry SDK initialized successfully (synchronous)');
  }
} catch (error: unknown) {
  console.error('❌ Failed to initialize OpenTelemetry:', error);
}
```

### 4.3 CORS Issues

- **Problem**: Browser console shows CORS errors when sending telemetry
- **Solution**: Configure CORS in Aspire dashboard settings

## 5. Testing and Verification

To verify your setup:

1. Run your Aspire application
2. Check the console logs for successful OpenTelemetry initialization  
3. Access the Aspire dashboard (typically at http://localhost:18888)
4. Navigate to the Telemetry section
5. Verify that telemetry from your Node.js applications appears

## References

- [.NET Aspire Dashboard Configuration](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/dashboard/configuration?tabs=bash#otlp-cors)
- [OpenTelemetry JS SDK Documentation](https://opentelemetry.io/docs/instrumentation/js/)
- [OpenTelemetry Protocol Specification](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/otlp.md)
