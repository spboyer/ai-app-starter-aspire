# PowerShell script to switch between different OpenTelemetry configurations
# This can be useful for troubleshooting connection issues

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("grpc", "http")]
    [string]$Protocol,
    
    [Parameter(Mandatory=$false)]
    [switch]$DisableTlsValidation,
    
    [Parameter(Mandatory=$false)]
    [switch]$EnableDebugLogging
)

# Define paths
$appHostPath = "c:\github\ai-app-starter-aspire\ai-app-starter-aspire.AppHost\Program.cs"
$appSettingsPath = "c:\github\ai-app-starter-aspire\ai-app-starter-aspire.AppHost\appsettings.json"
$apiIndexPath = "c:\github\ai-app-starter-aspire\NodeFortuneApi\src\index.ts"
$spaViteConfigPath = "c:\github\ai-app-starter-aspire\NodeFortuneSpa\vite.config.ts"

# Set protocol for AppHost configuration
Write-Host "Configuring OpenTelemetry protocol to: $Protocol" -ForegroundColor Yellow

$appHostContent = Get-Content $appHostPath -Raw

# Update protocol in AppHost
if ($Protocol -eq "http") {
    $appHostContent = $appHostContent -replace '\.WithEnvironment\("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc"\)', '.WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")'
} else {
    $appHostContent = $appHostContent -replace '\.WithEnvironment\("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf"\)', '.WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc")'
}

# Handle TLS validation setting
if ($DisableTlsValidation) {
    Write-Host "Disabling TLS certificate validation (development only)" -ForegroundColor Yellow
    # Check if NODE_TLS_REJECT_UNAUTHORIZED is already set
    if ($appHostContent -notmatch '\.WithEnvironment\("NODE_TLS_REJECT_UNAUTHORIZED", "0"\)') {
        $appHostContent = $appHostContent -replace '\.WithEnvironment\("OTEL_LOG_LEVEL", "debug"\)', '.WithEnvironment("OTEL_LOG_LEVEL", "debug")
    .WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0") // Disable TLS certificate validation for development only'
    }
} else {
    Write-Host "Enabling TLS certificate validation" -ForegroundColor Yellow
    $appHostContent = $appHostContent -replace '\.WithEnvironment\("NODE_TLS_REJECT_UNAUTHORIZED", "0"\) // Disable TLS certificate validation for development only', ''
}

# Handle debug logging
if ($EnableDebugLogging) {
    Write-Host "Enabling debug logging" -ForegroundColor Yellow
    if ($appHostContent -notmatch '\.WithEnvironment\("OTEL_LOG_LEVEL", "debug"\)') {
        $appHostContent = $appHostContent -replace '\.WithEnvironment\("OTEL_EXPORTER_OTLP_PROTOCOL", "[^"]+"\)', '.WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "' + $(if ($Protocol -eq "http") { "http/protobuf" } else { "grpc" }) + '")
    .WithEnvironment("OTEL_LOG_LEVEL", "debug") // For better diagnostics'
    }
} else {
    Write-Host "Disabling debug logging" -ForegroundColor Yellow
    $appHostContent = $appHostContent -replace '\.WithEnvironment\("OTEL_LOG_LEVEL", "debug"\) // For better diagnostics', ''
}

Set-Content -Path $appHostPath -Value $appHostContent
Write-Host "✅ Updated AppHost configuration" -ForegroundColor Green

# Update tracing import based on protocol preference
Write-Host "Updating application imports based on protocol preference..." -ForegroundColor Yellow

# Select tracing implementation based on protocol
$tracingImplementation = if ($Protocol -eq "http") {
    "tracing-http-compatible"
} else {
    "tracing-nextjs-compatible" # For gRPC
}

# Update API
$apiIndexContent = Get-Content $apiIndexPath -Raw
$apiIndexContent = $apiIndexContent -replace "import './tracing-[a-zA-Z0-9-]*';", "import './$tracingImplementation';"
Set-Content -Path $apiIndexPath -Value $apiIndexContent
Write-Host "✅ Updated API to use $tracingImplementation" -ForegroundColor Green

# Update SPA
$viteConfigFile = "c:\github\ai-app-starter-aspire\NodeFortuneSpa\vite-otel-$Protocol.js"
if (-not (Test-Path $viteConfigFile)) {
    Write-Host "Creating Vite OTLP setup file for $Protocol protocol..." -ForegroundColor Yellow
    @"
// OpenTelemetry initialization for Vite with $Protocol protocol compatibility
// This file is imported by vite.config.ts to enable OpenTelemetry for the Node process that runs Vite

// Import $Protocol-compatible tracing module
import './$tracingImplementation.js';

console.log('Vite OTLP setup complete with $Protocol protocol implementation');
"@ | Set-Content -Path $viteConfigFile
}

$spaViteConfigContent = Get-Content $spaViteConfigPath -Raw
$spaViteConfigContent = $spaViteConfigContent -replace "import './[a-zA-Z0-9-]*';", "import './vite-otel-$Protocol';"
Set-Content -Path $spaViteConfigPath -Value $spaViteConfigContent
Write-Host "✅ Updated SPA to use $Protocol protocol" -ForegroundColor Green

# Update CORS settings in appsettings.json if needed
if (-not (Test-Path $appSettingsPath)) {
    @"
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
"@ | Set-Content -Path $appSettingsPath
    Write-Host "✅ Created appsettings.json with OTLP CORS configuration" -ForegroundColor Green
} else {
    $appSettingsContent = Get-Content $appSettingsPath -Raw
    # Check if Dashboard section exists
    if ($appSettingsContent -notmatch '"Dashboard"') {
        $appSettingsContent = $appSettingsContent -replace '{', '{
  "Dashboard": {
    "Otlp": {
      "Cors": {
        "AllowedOrigins": "*",
        "AllowedHeaders": "*"
      }
    }
  },'
        Set-Content -Path $appSettingsPath -Value $appSettingsContent
        Write-Host "✅ Added OTLP CORS configuration to appsettings.json" -ForegroundColor Green
    } elseif ($appSettingsContent -notmatch '"Otlp"') {
        $appSettingsContent = $appSettingsContent -replace '"Dashboard": {', '"Dashboard": {
    "Otlp": {
      "Cors": {
        "AllowedOrigins": "*",
        "AllowedHeaders": "*"
      }
    },'
        Set-Content -Path $appSettingsPath -Value $appSettingsContent
        Write-Host "✅ Added OTLP CORS configuration to existing Dashboard section in appsettings.json" -ForegroundColor Green
    }
}

Write-Host "✅ Configuration complete!" -ForegroundColor Green
Write-Host "Protocol: $Protocol" -ForegroundColor Cyan
Write-Host "TLS Validation: $(if ($DisableTlsValidation) { "Disabled" } else { "Enabled" })" -ForegroundColor Cyan
Write-Host "Debug Logging: $(if ($EnableDebugLogging) { "Enabled" } else { "Disabled" })" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Build and run the application" -ForegroundColor Cyan
Write-Host "2. Check for OpenTelemetry connectivity issues" -ForegroundColor Cyan
Write-Host "3. If problems persist, try the alternative protocol" -ForegroundColor Cyan
