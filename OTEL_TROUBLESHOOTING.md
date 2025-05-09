# OpenTelemetry Aspire Integration Troubleshooting

This document outlines common issues and solutions for OpenTelemetry integration with .NET Aspire for Node.js applications.

## Common Issues

### 1. No Telemetry Appearing in Aspire Dashboard

If your Node.js applications (API and SPA) are running but no telemetry data appears in the Aspire dashboard, check the following:

#### Environment Variables

Ensure the proper environment variables are being passed from the Aspire AppHost:

```csharp
.WithEnvironment("OTEL_SERVICE_NAME", "servicename")
.WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", builder.Configuration["DOTNET_DASHBOARD_OTLP_ENDPOINT_URL"] ?? "http://localhost:4317")
.WithOtlpExporter()
```

#### Resource Creation

The most common issue is incorrect Resource creation. OpenTelemetry requires a properly configured Resource with the correct service name.

**Incorrect:**
```javascript
const resource = new resources.Resource({
  [semanticConventions.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
});
```

**Correct:**
```javascript
const resource = resources.resourceFromAttributes({
  [semanticConventions.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [semanticConventions.SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  'application.type': 'node.js-api',
  'node.version': process.version,
});
```

#### SDK Configuration

Ensure the OpenTelemetry SDK is properly configured with both trace and metric exporters:

```javascript
const sdk = new opentelemetry.NodeSDK({
  resource,
  traceExporter,
  metricReader: new opentelemetry.metrics.PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: true },
    }),
  ],
});
```

#### SDK Initialization

Ensure proper SDK initialization with error handling:

```javascript
try {
  // For Node SDK v0.24.0 and later, start() returns a promise
  const startPromise = sdk.start();
  if (startPromise instanceof Promise) {
    startPromise
      .then(() => console.log('✅ OpenTelemetry SDK started successfully'))
      .catch(error => console.error('❌ Error starting OpenTelemetry SDK:', error));
  } else {
    console.log('✅ OpenTelemetry SDK initialized successfully (synchronous)');
  }
} catch (error) {
  console.error('❌ Failed to initialize OpenTelemetry:', error);
}
```

## Debug Logging

Add debug logging to verify environment variables and configuration:

```javascript
console.log('Current environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  DOTNET_DASHBOARD_OTLP_ENDPOINT_URL: process.env.DOTNET_DASHBOARD_OTLP_ENDPOINT_URL
});
```

## Verifying Fixed Implementation

After applying the fixes in `tracing-fixed.js` and `tracing-fixed.ts`, restart your Aspire application and check the console output for:

1. Successful initialization messages
2. No errors related to OpenTelemetry
3. Proper environment variable logging

The Aspire dashboard should now display telemetry data from your Node.js applications.
