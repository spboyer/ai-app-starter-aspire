# PowerShell script to fix the HTTP/2 "Bad Request" error in OpenTelemetry

Write-Host "Applying HTTP/2 compatibility fix for OpenTelemetry..." -ForegroundColor Cyan

# 1. Update NodeFortuneSpa to use our fixed implementation
$viteConfigPath = "c:\github\ai-app-starter-aspire\NodeFortuneSpa\vite.config.ts"
$viteConfigContent = Get-Content -Path $viteConfigPath -Raw

# Update the import to use our fixed implementation
$updatedViteConfig = $viteConfigContent -replace "import './tracing-resilient\.js';", "// Import fixed HTTP/2 compatible tracing implementation`nimport './tracing-http2-fixed.js';"

# Save the changes
Set-Content -Path $viteConfigPath -Value $updatedViteConfig
Write-Host "✅ Updated NodeFortuneSpa to use HTTP/2 fixed implementation" -ForegroundColor Green

# 2. Update NodeFortuneApi to use our fixed implementation
$indexTsPath = "c:\github\ai-app-starter-aspire\NodeFortuneApi\src\index.ts"
$indexTsContent = Get-Content -Path $indexTsPath -Raw

# Update the import to use our fixed implementation
$updatedIndexTs = $indexTsContent -replace "import './tracing-http2-enhanced';", "// Import fixed HTTP/2 compatible tracing implementation`nimport './tracing-http2-fixed';"

# Save the changes
Set-Content -Path $indexTsPath -Value $updatedIndexTs
Write-Host "✅ Updated NodeFortuneApi to use HTTP/2 fixed implementation" -ForegroundColor Green

# 3. Set the environment variables for the app
$env:OTEL_EXPORTER_OTLP_PROTOCOL = "grpc"
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
$env:OTEL_LOG_LEVEL = "debug"
$env:OTEL_EXPORTER_OTLP_MAX_RETRIES = "5"
$env:OTEL_EXPORTER_OTLP_RETRY_DELAY_MS = "1000"

Write-Host "`nEnvironment variables set:" -ForegroundColor Yellow
Write-Host "OTEL_EXPORTER_OTLP_PROTOCOL=$env:OTEL_EXPORTER_OTLP_PROTOCOL"
Write-Host "NODE_TLS_REJECT_UNAUTHORIZED=$env:NODE_TLS_REJECT_UNAUTHORIZED"
Write-Host "OTEL_LOG_LEVEL=$env:OTEL_LOG_LEVEL"
Write-Host "OTEL_EXPORTER_OTLP_MAX_RETRIES=$env:OTEL_EXPORTER_OTLP_MAX_RETRIES"
Write-Host "OTEL_EXPORTER_OTLP_RETRY_DELAY_MS=$env:OTEL_EXPORTER_OTLP_RETRY_DELAY_MS"

Write-Host "`nAll HTTP/2 compatibility fixes have been applied!" -ForegroundColor Green
Write-Host "You can now run the application with: cd c:\github\ai-app-starter-aspire\ai-app-starter-aspire.AppHost && dotnet run" -ForegroundColor Green
