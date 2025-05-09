# PowerShell script to apply all OpenTelemetry fixes for socket hang-up and ECONNRESET errors

param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("nextjs", "http", "resilient")]
    [string]$Implementation = "resilient",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("grpc", "http")]
    [string]$Protocol = "http"
)

Write-Host "Applying all OpenTelemetry fixes for socket hang-up and ECONNRESET errors..." -ForegroundColor Cyan
Write-Host "Using implementation: $Implementation" -ForegroundColor Cyan
Write-Host "Using protocol: $Protocol" -ForegroundColor Cyan

# 1. Update AppHost configuration
Write-Host "`nStep 1: Updating AppHost configuration..." -ForegroundColor Yellow

$appHostPath = "c:\github\ai-app-starter-aspire\ai-app-starter-aspire.AppHost\Program.cs"
$appSettingsPath = "c:\github\ai-app-starter-aspire\ai-app-starter-aspire.AppHost\appsettings.json"

# Read the current AppHost content
$appHostContent = Get-Content $appHostPath -Raw

# Define the required environment variables
$envVars = @(
    "OTEL_EXPORTER_OTLP_PROTOCOL", 
    "NODE_TLS_REJECT_UNAUTHORIZED", 
    "OTEL_LOG_LEVEL", 
    "OTEL_EXPORTER_OTLP_MAX_RETRIES", 
    "OTEL_EXPORTER_OTLP_RETRY_DELAY_MS"
)

# Check which variables are already set
$missingVars = @()
foreach ($var in $envVars) {
    if ($appHostContent -notmatch "\.WithEnvironment\(`"$var`"") {
        $missingVars += $var
    }
}

# Add missing environment variables
foreach ($nodeProject in @("nodefortune-api", "nodefortune-spa")) {
    $projectPattern = "var $nodeProject = builder\.AddProject"
    
    if ($appHostContent -match $projectPattern) {
        $withOtlpPattern = "\.WithOtlpExporter\(\)"
        
        if ($appHostContent -match $withOtlpPattern) {
            $replacement = ".WithOtlpExporter()"
            
            # Add each missing environment variable
            if ($missingVars -contains "OTEL_EXPORTER_OTLP_PROTOCOL") {
                $replacement += "`n    .WithEnvironment(`"OTEL_EXPORTER_OTLP_PROTOCOL`", `"$($Protocol -eq 'http' ? 'http/protobuf' : 'grpc')`")"
            }
            
            if ($missingVars -contains "NODE_TLS_REJECT_UNAUTHORIZED") {
                $replacement += "`n    .WithEnvironment(`"NODE_TLS_REJECT_UNAUTHORIZED`", `"0`") // Disable TLS certificate validation for development only"
            }
            
            if ($missingVars -contains "OTEL_LOG_LEVEL") {
                $replacement += "`n    .WithEnvironment(`"OTEL_LOG_LEVEL`", `"debug`") // Enable debug logging"
            }
            
            if ($missingVars -contains "OTEL_EXPORTER_OTLP_MAX_RETRIES") {
                $replacement += "`n    .WithEnvironment(`"OTEL_EXPORTER_OTLP_MAX_RETRIES`", `"5`") // Add retry capability"
            }
            
            if ($missingVars -contains "OTEL_EXPORTER_OTLP_RETRY_DELAY_MS") {
                $replacement += "`n    .WithEnvironment(`"OTEL_EXPORTER_OTLP_RETRY_DELAY_MS`", `"1000`") // 1-second delay between retries"
            }
            
            # Apply the changes
            $appHostContent = $appHostContent -replace "\.WithOtlpExporter\(\)", $replacement
        }
    }
}

# Save the updated AppHost content
Set-Content -Path $appHostPath -Value $appHostContent
Write-Host "✅ Updated AppHost configuration with environment variables" -ForegroundColor Green

# 2. Update appsettings.json for CORS
Write-Host "`nStep 2: Updating appsettings.json for CORS..." -ForegroundColor Yellow

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
    } else {
        Write-Host "ℹ️ CORS configuration already exists in appsettings.json" -ForegroundColor Cyan
    }
}

# 3. Update Node.js API and SPA to use the selected implementation
Write-Host "`nStep 3: Updating Node.js applications to use $Implementation implementation..." -ForegroundColor Yellow

# Update API
$apiIndexPath = "c:\github\ai-app-starter-aspire\NodeFortuneApi\src\index.ts"
$apiIndexContent = Get-Content $apiIndexPath -Raw

# Get the implementation file name
$implementationMap = @{
    "nextjs" = "tracing-nextjs-compatible"
    "http" = "tracing-http-compatible"
    "resilient" = "tracing-resilient"
}
$tracingImplementation = $implementationMap[$Implementation]

# Update the import statement
$newApiIndexContent = $apiIndexContent -replace "import './tracing-[a-zA-Z0-9-]*';", "import './$tracingImplementation';"
if ($apiIndexContent -notmatch "import './tracing-[a-zA-Z0-9-]*';") {
    # Add the import at the top of the file
    $newApiIndexContent = "import './$tracingImplementation';" + "`n" + $apiIndexContent
}
Set-Content -Path $apiIndexPath -Value $newApiIndexContent
Write-Host "✅ Updated API to use $tracingImplementation" -ForegroundColor Green

# Update SPA
$spaViteConfigPath = "c:\github\ai-app-starter-aspire\NodeFortuneSpa\vite.config.ts"
$spaViteConfigContent = Get-Content $spaViteConfigPath -Raw

# Update the import statement
if ($spaViteConfigContent -match "import './[a-zA-Z0-9-]*';") {
    $newSpaViteConfigContent = $spaViteConfigContent -replace "import './[a-zA-Z0-9-]*';", "import './$tracingImplementation.js';"
    Set-Content -Path $spaViteConfigPath -Value $newSpaViteConfigContent
} else {
    # Add the import at the top of the file
    $newSpaViteConfigContent = "import './$tracingImplementation.js';" + "`n" + $spaViteConfigContent
    Set-Content -Path $spaViteConfigPath -Value $newSpaViteConfigContent
}
Write-Host "✅ Updated SPA to use $tracingImplementation.js" -ForegroundColor Green

# 4. Create run batch file
Write-Host "`nStep 4: Creating batch file to run the application..." -ForegroundColor Yellow

$batchFilePath = "c:\github\ai-app-starter-aspire\run-fixed-otlp.bat"
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
Write-Host "✅ Created batch file to run the application: $batchFilePath" -ForegroundColor Green

# 5. Final instructions
Write-Host "`nAll fixes have been applied successfully!" -ForegroundColor Green
Write-Host "`nTo run the application with all fixes:" -ForegroundColor Cyan
Write-Host "1. Build the application" -ForegroundColor Cyan
Write-Host "2. Run the batch file: $batchFilePath" -ForegroundColor Cyan
Write-Host "`nIf you still experience issues:" -ForegroundColor Cyan
Write-Host "1. Run the diagnostic script: .\diagnose-otlp-connection.ps1" -ForegroundColor Cyan
Write-Host "2. Try a different implementation: .\fix-all-otlp-issues.ps1 -Implementation http -Protocol http" -ForegroundColor Cyan
Write-Host "3. Check the troubleshooting guide: OTLP_TROUBLESHOOTING.md" -ForegroundColor Cyan
