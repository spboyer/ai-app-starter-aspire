# NextJS OpenTelemetry Integration with .NET Aspire

This guide provides recommendations for integrating NextJS applications with .NET Aspire's telemetry system based on findings from the [GitHub discussion thread](https://github.com/dotnet/aspire/discussions/5304).

## Key Insights

1. **Protocol Selection**
   - For server-side tracing: Use `gRPC` protocol
   - For client-side tracing: Use `http/protobuf` protocol
   - Use `OTEL_EXPORTER_OTLP_PROTOCOL` to explicitly set the protocol

2. **URL Formatting**
   - For gRPC protocol: Use the base URL without `/v1/traces` suffix
   - For HTTP protocol: Append `/v1/traces` for traces and `/v1/metrics` for metrics

3. **Headers**
   - For HTTP protocol: Add `Content-Type: application/x-protobuf` header

4. **NextJS Implementation Options**

### Option 1: Using @vercel/otel
```js
// instrumentation.ts
import { registerOTel } from '@vercel/otel';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { spanProcessors } = await import('./instrumentation.node');
    registerOTel({ spanProcessors: spanProcessors });
  }
}

// instrumentation.node.js
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';

const spanProcessors = [new BatchSpanProcessor(new OTLPTraceExporter())];

export { spanProcessors };
```

### Option 2: Manual SDK Configuration
```js
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { Resource } from '@opentelemetry/resources'
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { NodeSDK } from '@opentelemetry/sdk-node'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
 
const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
  }),
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
})
sdk.start()
```

## Environment Variables in Aspire Configuration

Use the following configuration in your Aspire AppHost:

```csharp
builder.AddNpmApp("your-nextjs-app", appPath, "start")
    .WithEnvironment("OTEL_SERVICE_NAME", "your-nextjs-app")
    .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", builder.Configuration["DOTNET_DASHBOARD_OTLP_ENDPOINT_URL"])
    .WithEnvironment("OTEL_EXPORTER_OTLP_HTTP_ENDPOINT", builder.Configuration["ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL"])
    .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc") // Use "http/protobuf" for client-side
    .WithEnvironment("OTEL_LOG_LEVEL", "debug") // Helpful for troubleshooting
    .WithOtlpExporter();
```

## Troubleshooting

If you encounter issues with SSL/TLS certificates during development, you can disable certificate validation for testing:

```csharp
.WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0")
```

> **Note**: Only use this in development environments, never in production.

## Client-Side Tracing

For client-side tracing (browser), ensure:

1. CORS is enabled on the Aspire dashboard to accept telemetry from browser sources
2. Use HTTP protocol, not gRPC (browsers can't use gRPC)
3. Use the correct content type header

Add the following to your `appsettings.json`:

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

## References

- [GitHub Discussion: How do I integrate NextJS' OpenTelemetry support with .Net Aspire?](https://github.com/dotnet/aspire/discussions/5304)
- [NextJS OpenTelemetry Documentation](https://nextjs.org/docs/app/building-your-application/optimizing/open-telemetry)
- [Aspire Documentation](https://learn.microsoft.com/en-us/dotnet/aspire/get-started/aspire-overview)
