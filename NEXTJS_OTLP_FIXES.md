# NextJS-Compatible OpenTelemetry Integration with Aspire

This document summarizes the changes made to implement NextJS-compatible OpenTelemetry integration with .NET Aspire for our Node.js applications.

## Issues Addressed

1. **TypeScript Error with SDK Configuration**
   - Removed `logLevel` property from NodeSDK configuration which was causing TypeScript errors
   - Used environment variable `OTEL_LOG_LEVEL` instead for configuring log level

2. **Self-Signed Certificate Errors**
   - Added `NODE_TLS_REJECT_UNAUTHORIZED=0` environment variable to bypass certificate validation in development
   - This is important for HTTPS connections to the Aspire OTLP endpoint

3. **URL Format for OTLP Exporters**
   - For gRPC protocol: Used base URL without `/v1/traces` suffix
   - For HTTP protocol: Appended `/v1/traces` and `/v1/metrics` to the respective endpoints

4. **Content Type Headers for HTTP Protocol**
   - Added `Content-Type: application/x-protobuf` for HTTP protocol

5. **Protocol Specification**
   - Added explicit `OTEL_EXPORTER_OTLP_PROTOCOL` environment variable 
   - Implemented different export URL configurations based on protocol

## Implementation Details

### 1. Improved Tracing Files

Created NextJS-compatible implementations:
- `NodeFortuneApi/src/tracing-nextjs-compatible.ts`
- `NodeFortuneSpa/tracing-nextjs-compatible.js`

These files include:
- Protocol detection and appropriate URL formatting
- Better error handling
- Explicit content type headers for HTTP protocol
- TLS certificate error handling

### 2. Updated AppHost Configuration

Modified `ai-app-starter-aspire.AppHost/Program.cs` to:
- Disable TLS certificate validation for Node.js apps in development
- Explicitly set OTLP protocol
- Enable debug logging
- Configure proper endpoint URLs

### 3. Fixed Implementation Highlights

```javascript
// Configuration based on protocol
if (otlpProtocol === 'grpc') {
  // For gRPC, use the base URL without /v1/traces
  traceExporter = new OTLPTraceExporter({
    url: otlpEndpoint, // Base URL without suffix
    // ...
  });
} else if (otlpProtocol === 'http/protobuf') {
  // For HTTP protocol, append /v1/traces to the endpoint URL
  traceExporter = new OTLPTraceExporter({
    url: `${otlpHttpEndpoint}/v1/traces`,
    headers: {
      'Content-Type': 'application/x-protobuf', // Required for HTTP protocol
    },
    // ...
  });
}
```

## Next Steps

1. **Verification**: Confirm that telemetry appears correctly in the Aspire dashboard
2. **Client-Side Tracing**: Test browser app telemetry collection
3. **Production Configuration**: Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` in production and implement proper SSL certificate handling

## References

- [GitHub Discussion: How do I integrate NextJS' OpenTelemetry support with .Net Aspire?](https://github.com/dotnet/aspire/discussions/5304)
- [NextJS OpenTelemetry Documentation](https://nextjs.org/docs/app/building-your-application/optimizing/open-telemetry)
- [Aspire Documentation](https://learn.microsoft.com/en-us/dotnet/aspire/get-started/aspire-overview)
