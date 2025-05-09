@echo off
echo Setting up environment for OpenTelemetry with resilient implementation
echo.

set NODE_TLS_REJECT_UNAUTHORIZED=0
set OTEL_LOG_LEVEL=debug
set OTEL_EXPORTER_OTLP_PROTOCOL=grpc
set OTEL_EXPORTER_OTLP_MAX_RETRIES=5
set OTEL_EXPORTER_OTLP_RETRY_DELAY_MS=1000

echo Environment variables set:
echo NODE_TLS_REJECT_UNAUTHORIZED=0
echo OTEL_LOG_LEVEL=debug
echo OTEL_EXPORTER_OTLP_PROTOCOL=%OTEL_EXPORTER_OTLP_PROTOCOL%
echo OTEL_EXPORTER_OTLP_MAX_RETRIES=%OTEL_EXPORTER_OTLP_MAX_RETRIES%
echo OTEL_EXPORTER_OTLP_RETRY_DELAY_MS=%OTEL_EXPORTER_OTLP_RETRY_DELAY_MS%
echo.

echo Running Aspire AppHost with resilient OpenTelemetry implementation...
echo.

cd ai-app-starter-aspire.AppHost
dotnet run
