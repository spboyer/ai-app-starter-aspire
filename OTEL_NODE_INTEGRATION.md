# OpenTelemetry Integration with .NET Aspire for Node.js

This document explains how we've integrated OpenTelemetry with Node.js applications in our .NET Aspire project to enable distributed tracing and monitoring.

## Table of Contents

1. [Overview](#overview)
2. [Implementation](#implementation)
   - [Server-side Tracing (Node.js API)](#server-side-tracing-nodejs-api)
   - [Client-side Tracing (React SPA)](#client-side-tracing-react-spa)
   - [Manual Instrumentation](#manual-instrumentation)
3. [Integration with Aspire](#integration-with-aspire)
4. [Testing the Integration](#testing-the-integration)
5. [Troubleshooting](#troubleshooting)

## Overview

Our implementation uses OpenTelemetry to collect telemetry data (traces, metrics, and logs) from both of our Node.js applications:

- **Fortune API** (Express.js with TypeScript)
- **Fortune SPA** (React with Vite)

Telemetry data is automatically sent to the .NET Aspire dashboard where it can be visualized together with telemetry from .NET services.

## Implementation

### Server-side Tracing (Node.js API)

For the Fortune API, we've implemented the following:

1. **Automatic Instrumentation**: Using the OpenTelemetry Node.js SDK to automatically instrument Express, HTTP clients, and database access.

2. **Resource Configuration**: Proper service name, version, and attributes for accurate resource identification.

3. **OTLP Exporter**: Configuration to send traces to Aspire's OpenTelemetry collector.

4. **Manual Instrumentation**: Custom span creation for specific API endpoints and database operations.

Implementation files:
- `NodeFortuneApi/src/tracing-updated.ts` - Main OpenTelemetry setup
- `NodeFortuneApi/src/tracing-helpers.ts` - Utility functions for manual instrumentation

### Client-side Tracing (React SPA)

For the SPA, we've implemented:

1. **Server-side Tracing**: For the Vite development server using the OpenTelemetry Node.js SDK.

2. **Client-side Logging**: A React utility that simulates OpenTelemetry spans in the browser console.

3. **Component Lifecycle Tracing**: Tracking component mounts, renders, and user interactions.

Implementation files:
- `NodeFortuneSpa/tracing-updated.js` - Server-side OpenTelemetry setup
- `NodeFortuneSpa/src/tracing-client.jsx` - Client-side tracing utilities

### Manual Instrumentation

In addition to automatic instrumentation, we've added manual instrumentation for:

1. **API Endpoints**: Trace requests with custom attributes
2. **Database Operations**: Track database access with timing
3. **User Interactions**: Measure response times for UI actions
4. **Component Rendering**: Monitor React component performance

## Integration with Aspire

.NET Aspire integration is configured in the `AppHost/Program.cs` file with these key configurations:

```csharp
.WithEnvironment("OTEL_SERVICE_NAME", "fortuneapi")
.WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", builder.Configuration["DOTNET_DASHBOARD_OTLP_ENDPOINT_URL"] ?? "http://localhost:4317")
.WithOtlpExporter()
```

This configures the Node.js applications to send telemetry to the same collector used by the .NET services.

## Testing the Integration

To verify that telemetry data is flowing correctly:

1. Start the application using `dotnet run --project .\ai-app-starter-aspire.AppHost\ai-app-starter-aspire.AppHost.csproj`
2. Open the Aspire dashboard at the URL shown in the terminal
3. Click on "Traces" in the left navigation
4. Filter to see spans from your Node.js services ("fortuneapi" and "fortunespa")
5. Generate activity by using the application
6. Check that spans appear in the dashboard

## Troubleshooting

Common issues and solutions:

1. **No Telemetry Data**: Verify that the OTLP endpoint environment variable is correctly set and accessible from the Node.js services.

2. **Missing Spans**: Check that the SDK initialization is successful and that the service names match what you're looking for in the dashboard.

3. **Module Errors**: Ensure that all OpenTelemetry packages are correctly installed and compatible with your Node.js version.

4. **Partial Data**: If only some spans are visible, check that the instrumented libraries match what your application is using.

5. **TypeScript Errors**: If you encounter TypeScript errors, ensure the relevant files are excluded from compilation or properly typed.
