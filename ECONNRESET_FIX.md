# ECONNRESET/Socket Hang-up Fix for OpenTelemetry in Node.js with Aspire

This document explains how to fix the "socket hang up" and "ECONNRESET" errors that can occur when using OpenTelemetry with Node.js applications in a .NET Aspire project.

## The Problem

The socket hang-up (`ECONNRESET`) errors typically occur when the connection between the Node.js application and the OpenTelemetry collector is unexpectedly closed. This can happen due to various reasons:

1. Network instability
2. Collector service restarts or is unavailable
3. Protocol mismatches
4. TLS certificate validation issues
5. Timeouts due to large batches of telemetry data

## Solution Summary

We've provided several improved implementations to address these issues:

1. **NextJS-compatible implementation** - Based on the NextJS approach to OpenTelemetry
2. **HTTP-specific implementation** - Uses HTTP/protobuf protocol instead of gRPC
3. **Resilient implementation** - Adds retry logic and error handling for network issues

Additionally, we've provided scripts to help troubleshoot and switch between implementations.

## Implementation Options

### 1. NextJS-compatible Implementation

This implementation follows the approach used by NextJS for OpenTelemetry integration, which works well with Aspire:

- Path: `NodeFortuneApi/src/tracing-nextjs-compatible.ts` and `NodeFortuneSpa/tracing-nextjs-compatible.js`
- Protocol awareness (works with both gRPC and HTTP/protobuf)
- Proper URL formatting for each protocol
- Content-Type headers for HTTP protocol

### 2. HTTP-specific Implementation

This implementation specifically uses the HTTP/protobuf protocol, which can be more reliable in some environments:

- Path: `NodeFortuneApi/src/tracing-http-compatible.ts` and `NodeFortuneSpa/tracing-http-compatible.js`
- Always uses HTTP/protobuf protocol
- Proper Content-Type headers
- Increased timeouts for better reliability

### 3. Resilient Implementation

This implementation adds enhanced error handling and retry logic:

- Path: `NodeFortuneApi/src/tracing-resilient.ts` and `NodeFortuneSpa/tracing-resilient.js`
- Automatic retries for network-related errors
- Circuit breaker pattern to prevent cascade failures
- Connection health checks
- Proper error handling to prevent application crashes
- Custom retry processor for OpenTelemetry (API only)

## How to Fix Socket Hang-up and ECONNRESET Issues

### Step 1: Run the Diagnostic Script

First, run the diagnostic script to identify potential issues:

```powershell
.\diagnose-otlp-connection.ps1
```

### Step 2: Try the Resilient Implementation

The resilient implementation includes built-in retry logic and error handling:

```powershell
.\update-otlp-implementation.ps1 -Implementation resilient -UpdateProtocol -Protocol grpc
```

### Step 3: Try Switching Protocols

If you're still experiencing issues, try switching to HTTP protocol:

```powershell
.\update-otlp-implementation.ps1 -Implementation resilient -UpdateProtocol -Protocol http
```

### Step 4: Disable TLS Certificate Validation (Development Only)

For local development, you may need to disable TLS certificate validation:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
```

Or use the `switch-otlp-config.ps1` script:

```powershell
.\switch-otlp-config.ps1 -Protocol grpc -DisableTlsValidation -EnableDebugLogging
```

### Step 5: Enable Debug Logging

Enable debug logging to get more information about the issues:

```powershell
$env:OTEL_LOG_LEVEL = "debug"
```

## Configuring AppHost for Better Reliability

Update your AppHost `Program.cs` file to include these environment variables:

```csharp
var nodeFortuneApi = builder.AddProject<Projects.NodeFortuneApi>("nodefortune-api")
    .WithEndpoint(hostSettings =>
                  hostSettings.Scheme("http")
                             .TargetPort(3501)
                             .Env("PORT=3501"),
                  "http")
    .WithOtlpExporter() // Enable OpenTelemetry
    .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc") // Specify protocol
    .WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0") // Disable TLS validation (development only)
    .WithEnvironment("OTEL_LOG_LEVEL", "debug") // Enable debug logging
    .WithEnvironment("OTEL_EXPORTER_OTLP_MAX_RETRIES", "5") // Add retry capability
    .WithEnvironment("OTEL_EXPORTER_OTLP_RETRY_DELAY_MS", "1000"); // 1-second delay between retries
```

## CORS Configuration for Aspire Dashboard

Update your `appsettings.json` file to enable CORS:

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

## Checking for Residual Issues

If you still experience issues after applying these fixes, check for:

1. Network firewall or proxy configurations
2. Antivirus software interference
3. Virtual machine network settings
4. Corporate network policies that may block certain ports or protocols

## Additional Resources

For more detailed troubleshooting steps, refer to:

- `OTLP_TROUBLESHOOTING.md` - Comprehensive troubleshooting guide
- `ASPIRE_NEXTJS_OTLP.md` - Details on NextJS-compatible implementation
- `NODEJS_ASPIRE_OTLP_SUMMARY.md` - Summary of findings and solutions
