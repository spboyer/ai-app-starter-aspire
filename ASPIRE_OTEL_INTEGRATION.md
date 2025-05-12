# OpenTelemetry Integration with Aspire for Node.js Applications

This document explains how to properly integrate a Node.js application with .NET Aspire's OpenTelemetry support, following [Microsoft's official documentation](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/dashboard/overview).

## How Aspire Telemetry Works

The .NET Aspire dashboard uses OpenTelemetry to collect telemetry data from applications. When the Aspire AppHost project is launched:

1. The Aspire dashboard starts and exposes an OTLP endpoint (specified in the `DOTNET_DASHBOARD_OTLP_ENDPOINT_URL` environment variable)
2. Applications send telemetry data to this endpoint using OpenTelemetry
3. The dashboard displays this data in a user-friendly interface

## Key Components

### 1. AppHost Configuration

In `appsettings.json`:
```json
"Aspire": {
  "Dashboard": {
    "NodeApps": {
      "Enabled": true,
      "TelemetryCollectionEnabled": true
    },
    "OtlpEndpoint": {
      "Protocol": "http/protobuf"
    }
  }
}
```

### 2. Node.js Extension

The `NodeJsExtensions.cs` file extends Aspire to configure Node.js applications with the correct telemetry settings:

```csharp
public static IResourceBuilder<NodeAppResource> WithNodeTelemetry(this IResourceBuilder<NodeAppResource> builder, string serviceName)
{
    // Use the Aspire dashboard's OTLP endpoint
    string otlpEndpoint = Environment.GetEnvironmentVariable("DOTNET_DASHBOARD_OTLP_ENDPOINT_URL") 
        ?? "http://localhost:4317";
    
    return builder
        .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", otlpEndpoint)
        .WithEnvironment("OTEL_SERVICE_NAME", serviceName)
        // Other telemetry settings...
}
```

### 3. Program.cs Integration

```csharp
var nodeApp = builder.AddNpmApp("myapp", "/path/to/app", "start")
    .WithHttpEndpoint(targetPort: 3000)
    .WithNodeTelemetry("my-service-name");
```

## Troubleshooting

If your Node.js application isn't sending telemetry to the Aspire dashboard:

1. **Check the OTLP Endpoint**: Run `./check-aspire-otlp.ps1` to verify connectivity to the OTLP endpoint
2. **Verify Environment Variables**: Make sure the `OTEL_EXPORTER_OTLP_ENDPOINT` is correctly set to the value of `DOTNET_DASHBOARD_OTLP_ENDPOINT_URL`
3. **Check Dashboard Configuration**: Ensure the AppHost's `appsettings.json` has `NodeApps` and `TelemetryCollectionEnabled` set to `true`
4. **Verify Node.js OpenTelemetry**: Make sure your Node.js application is properly configured to use OpenTelemetry

## How to Test

1. Start the Aspire AppHost project
2. Run your Node.js application through Aspire
3. Generate some activity in your application
4. Check the Aspire dashboard to see the telemetry data
