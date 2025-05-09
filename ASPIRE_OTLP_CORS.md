# .NET Aspire OTLP CORS Configuration

This document explains the CORS (Cross-Origin Resource Sharing) configuration for OpenTelemetry in .NET Aspire applications. This is critical for allowing browser apps like our Node SPA to send telemetry to the Aspire dashboard.

## Configuration Added

We've added the following configuration to `appsettings.json` in the AppHost project:

```json
"Dashboard": {
  "Otlp": {
    "Cors": {
      "AllowedOrigins": "*",
      "AllowedHeaders": "*"
    }
  }
}
```

## Why This is Needed

Browser applications like our NodeFortuneSpa are restricted by CORS policies from making cross-domain API calls. The OpenTelemetry JavaScript SDK in the browser needs to send telemetry data to the Aspire dashboard's OTLP endpoint, but these are on different origins:

- SPA Origin: http://localhost:3000
- Aspire OTLP Endpoint: http://localhost:18889 (or another port)

Without proper CORS configuration, the browser blocks these cross-origin requests, preventing telemetry data from being sent to the dashboard.

## How It Works

1. The Aspire dashboard reads the CORS configuration from the settings
2. It sets the appropriate CORS headers on responses from the OTLP endpoint
3. This allows the browser to send telemetry data from your SPA application

## Security Considerations

For production environments, consider restricting the allowed origins to specific domains rather than using the wildcard "*" which allows any origin.

Example of a more secure configuration:

```json
"Dashboard": {
  "Otlp": {
    "Cors": {
      "AllowedOrigins": "https://yourspa.example.com,https://anotherapp.example.com",
      "AllowedHeaders": "Content-Type,x-otlp-api-key"
    }
  }
}
```

## References

- [Aspire Dashboard Configuration Documentation](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/dashboard/configuration?tabs=bash#otlp-cors)
