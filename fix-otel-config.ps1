# PowerShell script to fix the OpenTelemetry configuration files

Write-Host "Fixing OpenTelemetry configuration files..." -ForegroundColor Yellow

# Fix the API tracing file
$apiTracingFile = "c:\github\ai-app-starter-aspire\NodeFortuneApi\src\tracing-nextjs-compatible.ts"
$apiContent = Get-Content $apiTracingFile -Raw
$apiContent = $apiContent -replace "logLevel: 'debug', // Enable debug logging", "// Note: logLevel is set via OTEL_LOG_LEVEL environment variable instead"
Set-Content -Path $apiTracingFile -Value $apiContent

# Fix the SPA tracing file
$spaTracingFile = "c:\github\ai-app-starter-aspire\NodeFortuneSpa\tracing-nextjs-compatible.js"
$spaContent = Get-Content $spaTracingFile -Raw
$spaContent = $spaContent -replace "logLevel: 'debug', // Enable debug logging", "// Note: logLevel is set via OTEL_LOG_LEVEL environment variable instead"
Set-Content -Path $spaTracingFile -Value $spaContent

Write-Host "OpenTelemetry configuration files fixed!" -ForegroundColor Green

# Now let's update the AppHost to disable certificate validation for Node.js
Write-Host "Updating AppHost to disable certificate validation for Node.js..." -ForegroundColor Yellow

$appHostFile = "c:\github\ai-app-starter-aspire\ai-app-starter-aspire.AppHost\Program.cs"
$appHostContent = Get-Content $appHostFile -Raw

# Add NODE_TLS_REJECT_UNAUTHORIZED for NodeFortuneApi
$apiEnvPattern = '.WithEnvironment\("OTEL_LOG_LEVEL", "debug"\) // For better diagnostics'
$apiEnvReplacement = '.WithEnvironment("OTEL_LOG_LEVEL", "debug") // For better diagnostics
    .WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0") // Disable TLS certificate validation for development only'
$appHostContent = $appHostContent -replace $apiEnvPattern, $apiEnvReplacement

# Add NODE_TLS_REJECT_UNAUTHORIZED for NodeFortuneSpa
$spaEnvPattern = '.WithEnvironment\("OTEL_LOG_LEVEL", "debug"\) // For better diagnostics'
$spaEnvReplacement = '.WithEnvironment("OTEL_LOG_LEVEL", "debug") // For better diagnostics
    .WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0") // Disable TLS certificate validation for development only'
$appHostContent = $appHostContent -replace $spaEnvPattern, $spaEnvReplacement

Set-Content -Path $appHostFile -Value $appHostContent

Write-Host "AppHost updated to disable certificate validation for Node.js!" -ForegroundColor Green

# Create a PowerShell script to update the imports in index.ts and vite.config.ts
Write-Host "Creating a script to update imports..." -ForegroundColor Yellow

$updateScript = @"
# PowerShell script to update imports in index.ts and vite.config.ts

Write-Host "Updating imports to use NextJS-compatible tracing..." -ForegroundColor Yellow

# Update the main API file to use the NextJS-compatible tracing
\$apiIndexFile = "c:\github\ai-app-starter-aspire\NodeFortuneApi\src\index.ts"
\$apiIndexContent = Get-Content \$apiIndexFile -Raw
\$apiIndexContent = \$apiIndexContent -replace "import './tracing-[a-zA-Z0-9-]*';", "import './tracing-nextjs-compatible';"
Set-Content -Path \$apiIndexFile -Value \$apiIndexContent

# Update the Vite configuration to use the NextJS-compatible tracing
\$viteConfigFile = "c:\github\ai-app-starter-aspire\NodeFortuneSpa\vite.config.ts"
\$viteConfigContent = Get-Content \$viteConfigFile -Raw
\$viteConfigContent = \$viteConfigContent -replace "import './[a-zA-Z0-9-]*';", "import './vite-otel-nextjs';"
Set-Content -Path \$viteConfigFile -Value \$viteConfigContent

Write-Host "Imports updated to use NextJS-compatible tracing!" -ForegroundColor Green
"@

Set-Content -Path "c:\github\ai-app-starter-aspire\update-imports.ps1" -Value $updateScript

Write-Host "All fixes applied successfully!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run 'pwsh -File c:\github\ai-app-starter-aspire\update-imports.ps1' to update imports" -ForegroundColor Cyan
Write-Host "2. Rebuild and run the application" -ForegroundColor Cyan
