# OpenTelemetry Integration with .NET Aspire

This document explains how OpenTelemetry is integrated in both Node.js applications in this project.

## Overview

OpenTelemetry is an observability framework that provides tools for generating, collecting, and exporting telemetry data (metrics, logs, and traces) to help you analyze your application's performance and behavior.

In this project, we've integrated OpenTelemetry with:
- NodeFortuneApi (Express.js API)
- NodeFortuneSpa (React SPA with Vite)

## Implementation Details

### 1. Dependencies

Both applications include these OpenTelemetry packages:
```json
"@opentelemetry/api": "^1.9.0",
"@opentelemetry/auto-instrumentations-node": "^0.58.1",
"@opentelemetry/exporter-metrics-otlp-proto": "^0.200.0",
"@opentelemetry/exporter-trace-otlp-proto": "^0.200.0",
"@opentelemetry/sdk-node": "^0.200.0"
```

### 2. Tracing Configuration

Each application has a `tracing.ts/js` file that configures OpenTelemetry:

```javascript
const sdk = new opentelemetry.NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  }),
  traceExporter,
  metricExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});
```

This sets up automatic instrumentation for common libraries and frameworks.

### 3. Aspire Integration

In the AppHost `Program.cs`, we configure OTLP exporters:

```csharp
.WithEnvironment("OTEL_SERVICE_NAME", "fortuneapi")
.WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", builder.Configuration["DOTNET_DASHBOARD_OTLP_ENDPOINT_URL"] ?? "http://localhost:4317")
.WithOtlpExporter()
```

This connects the Node.js applications' telemetry to the Aspire dashboard.

### 4. Client-Side Tracing (SPA)

For the React SPA, we created a basic client-side tracing utility (`tracing-client.jsx`) that:
- Logs component mounting/unmounting
- Traces API calls
- Monitors user interactions

This is used in the App component to trace fortune fetching:
```jsx
const { traceApiCall, traceUserInteraction, traceUserInteractionEnd } = useTracing();

// Later in the code
const interactionStart = traceUserInteraction('fetch-fortune-button-click');
const res = await traceApiCall('/api/fortunes/random');
// ...
traceUserInteractionEnd('fetch-fortune-button-click', interactionStart);
```

## Viewing Telemetry

All telemetry data is sent to the .NET Aspire dashboard, where you can:
1. View service traces
2. Monitor performance metrics
3. See distributed trace spans across services
4. Analyze dependencies between services

## Adding Custom Instrumentation

You can add custom spans and metrics in your code using the OpenTelemetry API:

```javascript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-custom-tracer');
tracer.startActiveSpan('custom-operation', span => {
  // Perform the operation
  span.setAttribute('custom.attribute', 'value');
  span.end();
});
```

## References

- [.NET Aspire with Node.js](https://learn.microsoft.com/en-us/dotnet/aspire/get-started/build-aspire-apps-with-nodejs)
- [OpenTelemetry JavaScript Documentation](https://opentelemetry.io/docs/languages/js/)
- [OpenTelemetry API for JS](https://www.npmjs.com/package/@opentelemetry/api)
