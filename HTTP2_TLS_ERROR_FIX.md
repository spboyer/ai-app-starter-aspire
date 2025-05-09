# HTTP/2 over TLS Error Fix

## Issue
The Aspire dashboard was experiencing a "HTTP/2 over TLS was not negotiated on an HTTP/2-only endpoint" error when attempting to connect Node.js applications to the OpenTelemetry endpoint. This error occurred because of protocol mismatches between the configured endpoints and the actual connections.

## Solution
The solution involves the following changes:

### 1. Simplify Endpoint Configuration

**Changes in appsettings.json:**
- Removed mixed HTTP/HTTPS configuration
- Simplified OTLP configuration to use only HTTP/protobuf protocol
- Removed Kestrel explicit endpoint configuration that was conflicting with defaults

```json
{
  "Dashboard": {
    "AllowAnonymous": true,
    "UseHttpsRedirection": false,
    "Otlp": {
      "AuthMode": "None",
      "Protocols": [ "HttpProtobuf" ],
      "Http": {
        "Port": 18890,
        "Scheme": "http"
      }
    }
  }
}
```

### 2. Use HTTP-Only Launch Profile

**Changes in launchSettings.json:**
- Removed HTTPS profile
- Added necessary environment variables for HTTP connections
- Configured TLS bypass settings for development

```json
{
  "profiles": {    
    "http": {
      "commandName": "Project",
      "applicationUrl": "http://localhost:15089",
      "environmentVariables": {
        "ASPIRE_ALLOW_UNSECURED_TRANSPORT": "true",
        "NODE_TLS_REJECT_UNAUTHORIZED": "0",
        "DOTNET_SYSTEM_NET_HTTP_SOCKETSHTTPHANDLER_HTTP2UNENCRYPTEDSUPPORT": "true"
      }
    }
  }
}
```

### 3. Consistent Environment Variables

**Changes in Program.cs:**
- Standardized environment variables for all components
- Used same OTLP endpoint URL format for all Node.js services
- Ensured TLS validation is disabled for development
- Used only HTTP protocol for OTLP connections

```csharp
Environment.SetEnvironmentVariable("ASPIRE_ALLOW_UNSECURED_TRANSPORT", "true");
Environment.SetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED", "0");
```

```csharp
// Node.js app configuration
.WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:18890")
.WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")
```

## Results
- Successfully eliminated the "HTTP/2 over TLS was not negotiated" error
- The Aspire dashboard now starts without errors
- The application runs with proper HTTP configuration
- OTLP connections can now be established between services

## Next Steps
- Continue monitoring for any OpenTelemetry connection issues
- Review additional OTLP configuration settings in the resilient tracing implementation
- Consider adding HTTPS support with proper certificate configuration for production environments
