# PowerShell script to update Node.js applications to use a specific OpenTelemetry implementation
# This can be useful for testing different connection strategies to resolve socket hang-up errors

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("nextjs", "http", "resilient")]
    [string]$Implementation,
    
    [Parameter(Mandatory=$false)]
    [switch]$UpdateProtocol,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("grpc", "http")]
    [string]$Protocol = "grpc"
)

# Define paths
$apiIndexPath = "c:\github\ai-app-starter-aspire\NodeFortuneApi\src\index.ts"
$spaViteConfigPath = "c:\github\ai-app-starter-aspire\NodeFortuneSpa\vite.config.ts"
$appHostPath = "c:\github\ai-app-starter-aspire\ai-app-starter-aspire.AppHost\Program.cs"

# Map implementation names to file names
$implementationMap = @{
    "nextjs" = "tracing-nextjs-compatible"
    "http" = "tracing-http-compatible"
    "resilient" = "tracing-resilient"
}

$tracingImplementation = $implementationMap[$Implementation]

Write-Host "Switching to $Implementation implementation ($tracingImplementation)..." -ForegroundColor Yellow

# Update API
$apiIndexContent = Get-Content $apiIndexPath -Raw
$newApiIndexContent = $apiIndexContent -replace "import './tracing-[a-zA-Z0-9-]*';", "import './$tracingImplementation';"

if ($apiIndexContent -ne $newApiIndexContent) {
    Set-Content -Path $apiIndexPath -Value $newApiIndexContent
    Write-Host "✅ Updated API to use $tracingImplementation" -ForegroundColor Green
} else {
    Write-Host "ℹ️ API is already using $tracingImplementation" -ForegroundColor Cyan
}

# Update SPA
$spaViteConfigContent = Get-Content $spaViteConfigPath -Raw

# Check if we need to update the vite config file import
if ($spaViteConfigContent -match "import './[a-zA-Z0-9-]*';") {
    $newSpaViteConfigContent = $spaViteConfigContent -replace "import './[a-zA-Z0-9-]*';", "import './$tracingImplementation.js';"
    Set-Content -Path $spaViteConfigPath -Value $newSpaViteConfigContent
    Write-Host "✅ Updated SPA to use $tracingImplementation.js" -ForegroundColor Green
} else {
    # Add the import at the top of the file
    $newSpaViteConfigContent = "import './$tracingImplementation.js';" + "`n" + $spaViteConfigContent
    Set-Content -Path $spaViteConfigPath -Value $newSpaViteConfigContent
    Write-Host "✅ Added $tracingImplementation.js import to SPA" -ForegroundColor Green
}

# Update protocol in AppHost if requested
if ($UpdateProtocol) {
    Write-Host "Updating AppHost to use $Protocol protocol..." -ForegroundColor Yellow
    
    $appHostContent = Get-Content $appHostPath -Raw
    
    # Check if OTEL_EXPORTER_OTLP_PROTOCOL is already set
    $hasProtocolEnv = $appHostContent -match '\.WithEnvironment\("OTEL_EXPORTER_OTLP_PROTOCOL", "[^"]+"\)'
    
    if ($hasProtocolEnv) {
        if ($Protocol -eq "http") {
            $appHostContent = $appHostContent -replace '\.WithEnvironment\("OTEL_EXPORTER_OTLP_PROTOCOL", "[^"]+"\)', '.WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")'
        } else {
            $appHostContent = $appHostContent -replace '\.WithEnvironment\("OTEL_EXPORTER_OTLP_PROTOCOL", "[^"]+"\)', '.WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc")'
        }
    } else {
        # Add protocol environment variable
        $appHostContent = $appHostContent -replace '\.WithEndpoint\("[^"]+"\)', ".WithEndpoint(`"`$otlpEndpoint`")
    .WithEnvironment(`"OTEL_EXPORTER_OTLP_PROTOCOL`", `"$($Protocol -eq 'http' ? 'http/protobuf' : 'grpc')`")"
    }
    
    # Ensure NODE_TLS_REJECT_UNAUTHORIZED is set for development
    if ($appHostContent -notmatch '\.WithEnvironment\("NODE_TLS_REJECT_UNAUTHORIZED", "0"\)') {
        $appHostContent = $appHostContent -replace '\.WithEnvironment\("OTEL_EXPORTER_OTLP_PROTOCOL", "[^"]+"\)', ".WithEnvironment(`"OTEL_EXPORTER_OTLP_PROTOCOL`", `"$($Protocol -eq 'http' ? 'http/protobuf' : 'grpc')`")
    .WithEnvironment(`"NODE_TLS_REJECT_UNAUTHORIZED`", `"0`") // Disable TLS certificate validation for development only"
    }
    
    # Ensure debug logging is enabled
    if ($appHostContent -notmatch '\.WithEnvironment\("OTEL_LOG_LEVEL", "debug"\)') {
        $appHostContent = $appHostContent -replace '\.WithEnvironment\("NODE_TLS_REJECT_UNAUTHORIZED", "0"\)', '.WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0")
    .WithEnvironment("OTEL_LOG_LEVEL", "debug") // Enable debug logging'
    }
    
    Set-Content -Path $appHostPath -Value $appHostContent
    Write-Host "✅ Updated AppHost to use $Protocol protocol" -ForegroundColor Green
}

# Create a batch file to run the application with proper environment variables
$batchFilePath = "c:\github\ai-app-starter-aspire\run-with-otlp-$Implementation.bat"
@"
@echo off
echo Setting up environment for OpenTelemetry with $Implementation implementation
echo.

set NODE_TLS_REJECT_UNAUTHORIZED=0
set OTEL_LOG_LEVEL=debug
set OTEL_EXPORTER_OTLP_PROTOCOL=$($Protocol -eq 'http' ? 'http/protobuf' : 'grpc')
set OTEL_EXPORTER_OTLP_MAX_RETRIES=5
set OTEL_EXPORTER_OTLP_RETRY_DELAY_MS=1000

echo Environment variables set:
echo NODE_TLS_REJECT_UNAUTHORIZED=0
echo OTEL_LOG_LEVEL=debug
echo OTEL_EXPORTER_OTLP_PROTOCOL=%OTEL_EXPORTER_OTLP_PROTOCOL%
echo OTEL_EXPORTER_OTLP_MAX_RETRIES=%OTEL_EXPORTER_OTLP_MAX_RETRIES%
echo OTEL_EXPORTER_OTLP_RETRY_DELAY_MS=%OTEL_EXPORTER_OTLP_RETRY_DELAY_MS%
echo.

echo Running Aspire AppHost with $Implementation OpenTelemetry implementation...
echo.

cd ai-app-starter-aspire.AppHost
dotnet run
"@ | Set-Content -Path $batchFilePath

Write-Host "✅ Created batch file to run with $Implementation implementation: $batchFilePath" -ForegroundColor Green

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Build and run the application using the batch file:" -ForegroundColor Cyan
Write-Host "   $batchFilePath" -ForegroundColor Cyan
Write-Host "2. Check for OpenTelemetry connectivity issues" -ForegroundColor Cyan
Write-Host "3. If problems persist, try a different implementation with:" -ForegroundColor Cyan
Write-Host "   .\update-otlp-implementation.ps1 -Implementation http" -ForegroundColor Cyan
