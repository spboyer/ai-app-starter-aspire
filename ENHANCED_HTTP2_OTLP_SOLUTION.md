# Enhanced HTTP/2 OpenTelemetry Integration for Node.js in Aspire

This document describes the final solution for properly integrating Node.js applications with .NET Aspire's OpenTelemetry (OTLP) endpoints.

## Core Issues Addressed

1. **HTTP/2 Protocol Negotiation** - Fixed the "HTTP/2 over TLS was not negotiated on an HTTP/2-only endpoint" error
2. **ECONNREFUSED Errors** - Resolved connection refused errors by ensuring the correct endpoints are accessible
3. **Environment Variable Consistency** - Ensured all required environment variables are correctly set
4. **Protocol Compatibility** - Created specific HTTP/2 optimized implementations with proper error handling

## Solution Components

### 1. Aspire Dashboard Configuration

The Aspire Dashboard OTLP endpoints are configured to use HTTP/2 explicitly:

```json
"Otlp": {
  "Protocols": [ "HttpProtobuf", "Grpc" ],
  "Http": {
    "Enabled": true,
    "Port": 18890,
    "Scheme": "http",
    "BaseAddress": "http://localhost:18890",
    "Protocols": "Http2"
  },
  "Grpc": {
    "Enabled": true,
    "Port": 4317,
    "Scheme": "http",
    "BaseAddress": "http://localhost:4317",
    "Protocols": "Http2"
  }
}
```

### 2. Environment Variables

Essential environment variables are set in Program.cs:

```csharp
Environment.SetEnvironmentVariable("ASPIRE_ALLOW_UNSECURED_TRANSPORT", "true");
Environment.SetEnvironmentVariable("DOTNET_SYSTEM_NET_HTTP_SOCKETSHTTPHANDLER_HTTP2UNENCRYPTEDSUPPORT", "true");
Environment.SetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED", "0");
Environment.SetEnvironmentVariable("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf");
```

### 3. Node.js Service Configuration

Each Node.js service is configured with appropriate environment variables:

```csharp
.WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:18890")
.WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")
.WithEnvironment("OTEL_LOG_LEVEL", "debug")
.WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0")
.WithEnvironment("ASPIRE_ALLOW_UNSECURED_TRANSPORT", "true")
```

### 4. Enhanced HTTP/2 OpenTelemetry Implementation

Created specialized HTTP/2 implementations:

- **NodeFortuneApi/src/tracing-http2-enhanced.ts** - Implements direct HTTP/2 connection handling
- **NodeFortuneSpa/tracing-http2-enhanced.js** - Equivalent implementation for the SPA
- **NodeFortuneSpa/vite-otel-http2-enhanced.js** - Vite integration for the HTTP/2 implementation

The enhanced implementation includes:

- Native HTTP/2 session management using Node.js `http2` module
- Automatic detection of HTTP vs HTTPS protocols
- TLS certificate validation bypass for development
- Connection status monitoring and reporting
- Graceful shutdown handling
- Comprehensive error handling and retry mechanisms
- Detailed diagnostic logging

## Testing and Verification

A specialized test script `test-otlp-http2-enhanced.ps1` verifies:

1. TCP connectivity to all required ports (18890, 4317, 15089)
2. Environment variable configuration
3. Sets missing environment variables if needed
4. Provides next steps for running and verifying the application

## Implementation Details

### HTTP/2 Session Management

The implementation creates a direct HTTP/2 session to the OTLP endpoint:

```javascript
// Create HTTP/2 session for more efficient connections
let http2Session = null;
try {
  if (otlpEndpoint.startsWith('http://')) {
    http2Session = http2.connect(`http://${baseUrl}`);
  } else {
    http2Session = http2.connect(`https://${baseUrl}`, {
      rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0' 
    });
  }
} catch (e) {
  console.error('❌ Failed to establish HTTP/2 session:', e);
}
```

### Connection Verification

The implementation tests the connection to the OTLP endpoint:

```javascript
// Verify OTLP connection
setTimeout(async () => {
  try {
    if (http2Session && !http2Session.destroyed) {
      const req = http2Session.request({ 
        ':path': '/v1/traces',
        ':method': 'HEAD'
      });
      
      req.on('response', (headers) => {
        console.log('✅ OTLP collector connection test: Response status:', headers[':status']);
      });
      
      req.end();
    }
  } catch (err) {
    console.error('🔴 OTLP collector connection check failed:', err);
  }
}, 5000);
```

## Conclusion

By implementing these changes, Node.js applications can now reliably connect to the Aspire dashboard's OpenTelemetry endpoints using HTTP/2 protocol. Telemetry data should now appear in the Aspire dashboard for both the API and SPA services.
