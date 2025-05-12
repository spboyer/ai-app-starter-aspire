# OpenTelemetry Troubleshooting

This document provides comprehensive troubleshooting steps for OpenTelemetry integration with .NET Aspire in Node.js applications.

## Common Issues

### OTLP Connection Refused Error

If you see this error in your logs:

```plaintext
ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:4318
```

This means the Node.js application cannot connect to the OpenTelemetry collector. This could be due to:

1. The Aspire dashboard is not running
2. The OTLP endpoint is not enabled in the Aspire dashboard
3. The OTLP endpoint is running on a different port or host
4. A firewall is blocking the connection
5. Aspire is not correctly exposing the OTLP endpoint

### SSL/TLS Certificate Errors

If you see errors like these in your logs:

```plaintext
Error: self-signed certificate; if the root CA is installed locally, try running Node.js with --use-system-ca
code: 'DEPTH_ZERO_SELF_SIGNED_CERT'
```

This happens when your Node.js application is trying to connect to an HTTPS OTLP endpoint that uses a self-signed certificate. Here are the solutions:

1. **Disable certificate validation** (recommended for development only):
   
   Add this to your `.otelenv` file:
   ```
   NODE_TLS_REJECT_UNAUTHORIZED=0
   ```
   
   Or if you're using the NodeJsExtensions.cs file, add this environment variable:
   ```csharp
   .WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0")
   ```

2. **Use HTTP instead of HTTPS** for local development:
   
   Change your OTLP endpoint from `https://` to `http://`, if possible.

3. **Install the self-signed certificate** in your system's trust store.

4. **Run Node.js with system CA certificates**:
   
   ```bash
   node --use-system-ca yourapp.js
   ```
   
   For npm scripts, add the flag to your package.json:
   ```json
   "scripts": {
     "start": "node --use-system-ca app.js"
   }
   ```
6. Your network configuration is preventing localhost connections

### Diagnosing Connection Issues

Run our connectivity testing utility to check if the OTLP endpoint is accessible:

```bash
npm run check-otlp
```

This will:
- Test TCP connectivity to the configured OTLP endpoint
- Try alternative endpoints if the primary one fails
- Verify the OpenTelemetry SDK initialization
- Report detailed error information

### Automatic Fallback System

Our application now includes an automatic fallback system that:

1. Detects when the OTLP endpoint is unavailable
2. Switches to console exporters to keep the application running
3. Periodically checks if the OTLP endpoint becomes available
4. Automatically switches back to OTLP exporters when possible

You can control this behavior through environment variables in `.otelenv`:

```ini
# Use 'none', 'console', or 'mixed'
OTLP_FALLBACK_MODE=console

# Set to false to prevent auto-reconnection
OTLP_AUTO_RECONNECT=true

# How often to check for OTLP availability (ms)
OTLP_RECONNECT_INTERVAL=30000

# Set to false to disable background reconnection checks
OTLP_CHECK_RECONNECT=true

# Show all OTLP connection errors in console
SHOW_OTLP_ERRORS=false
```

### Status Dashboard

The application now provides a comprehensive web-based status dashboard:

- **URL:** http://localhost:4000/status or http://localhost:4000/api/otel

This dashboard shows:
- Current connection status
- Active exporter configuration
- Environment variables affecting telemetry
- Interactive connection testing
- Ability to switch between exporters

### API Endpoints for Diagnostics

The application exposes several REST endpoints for monitoring and controlling OpenTelemetry:

- **GET /api/telemetry-status** - Basic telemetry status JSON
- **GET /api/otel/status** - Detailed OpenTelemetry configuration and connection status
- **POST /api/otel/reconnect** - Force a reconnection attempt to the OTLP endpoint
- **POST /api/otel/exporters** - Change exporter type (options: otlp, console, mixed)

Example using PowerShell to test connectivity and status:

```powershell
# Get telemetry status
Invoke-RestMethod -Uri "http://localhost:4000/api/telemetry-status"

# Force reconnection to OTLP endpoint
Invoke-RestMethod -Uri "http://localhost:4000/api/otel/reconnect" -Method Post

# Switch to console exporters
Invoke-RestMethod -Uri "http://localhost:4000/api/otel/exporters" `
  -Method Post -ContentType "application/json" `
  -Body '{"type":"console"}'
```

## Configuring Aspire for OpenTelemetry

For the integration to work correctly, the Aspire configuration needs to expose the OTLP endpoint. Run our configuration script to set up Aspire correctly:

```powershell
# From the root of the solution
./configure-aspire-otel.ps1
```

This script will:
1. Check if the Aspire Dashboard is running
2. Test connectivity to the OTLP endpoint
3. Configure the proper environment variables
4. Update `.otelenv` with the correct settings
5. Check the AppHost configuration

Example:

```bash
curl http://localhost:4000/api/otel/status
```

### Troubleshooting Steps

#### Check the Aspire Configuration

Make sure your `appsettings.json` file in the AppHost project has the correct configuration:

```json
"Aspire": {
  "Otlp": {
    "Endpoint": "http://localhost:4318",
    "ExportProtocol": "HttpProtobuf"
  },
  "Dashboard": {
    "NodeApps": {
      "Enabled": true,
      "TelemetryCollectionEnabled": true
    }
  }
}
```

#### Run the OTLP Connectivity Test

```powershell
cd NodeFortuneApi
npm run check-otlp
```

#### Use the Coordinated Start Script

The `start-with-aspire.ps1` script at the root of the solution will:

- Start the Aspire dashboard
- Wait for it to initialize
- Check for OTLP endpoint availability
- Start the Node.js application with the correct configuration

```powershell
.\start-with-aspire.ps1
```

#### Manually Specify the OTLP Endpoint

If you know the correct endpoint, you can run:

```powershell
cd NodeFortuneApi
$env:OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318"
npm run dev
```

#### Temporarily Disable OTLP Export

If you need to run the application without telemetry export:

```powershell
cd NodeFortuneApi
$env:OTEL_TRACES_EXPORTER = "console"
$env:OTEL_METRICS_EXPORTER = "console"
$env:OTEL_LOGS_EXPORTER = "console"
npm run dev
```

## Checking Telemetry in Aspire Dashboard

1. Start the Aspire dashboard using `dotnet run --project ai-app-starter-aspire.AppHost`
2. Open the dashboard at `http://localhost:18888`
3. Look for the "fortune-api" service in the dashboard
4. Check the "Telemetry" tab for traces, metrics, and logs

## Manual Verification

You can manually verify that traces are being generated by:

1. Start the application with debug logging enabled:

   ```powershell
   $env:OTEL_DEBUG = "true"
   $env:OTEL_LOG_LEVEL = "debug"
   npm run dev
   ```

2. Make a request to the API:

   ```powershell
   curl http://localhost:4000/fortunes/random
   ```

3. Check the console output for trace generation and export attempts
