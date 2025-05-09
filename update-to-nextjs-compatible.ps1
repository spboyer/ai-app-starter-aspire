# PowerShell script to update the OpenTelemetry configuration for Node.js applications to be NextJS-compatible

Write-Host "Updating OpenTelemetry implementation to NextJS-compatible version..." -ForegroundColor Cyan

# Update the main API file to use the NextJS-compatible tracing
$apiIndexContent = Get-Content -Path "NodeFortuneApi\src\index.ts" -Raw
$updatedApiIndexContent = $apiIndexContent -replace 'import \.\/tracing-[a-zA-Z0-9-]*;', 'import "./tracing-nextjs-compatible";'
Set-Content -Path "NodeFortuneApi\src\index.ts" -Value $updatedApiIndexContent
Write-Host "✅ Updated NodeFortuneApi\src\index.ts to use NextJS-compatible tracing" -ForegroundColor Green

# Update Vite configuration for the SPA
$viteOtelNextJsContent = @"
// OpenTelemetry initialization for Vite with NextJS compatibility
// This file is imported by vite.config.ts to enable OpenTelemetry for the Node process that runs Vite

// Import NextJS-compatible tracing module
import './tracing-nextjs-compatible.js';

console.log('Vite OTLP setup complete with NextJS-compatible implementation');
"@
Set-Content -Path "NodeFortuneSpa\vite-otel-nextjs.js" -Value $viteOtelNextJsContent
Write-Host "✅ Created NodeFortuneSpa\vite-otel-nextjs.js" -ForegroundColor Green

# Update Vite configuration
$viteConfigContent = Get-Content -Path "NodeFortuneSpa\vite.config.ts" -Raw
$updatedViteConfigContent = $viteConfigContent -replace 'import \.\/(vite-otel-[a-zA-Z0-9-]*|tracing-[a-zA-Z0-9-]*);', 'import "./vite-otel-nextjs";'
Set-Content -Path "NodeFortuneSpa\vite.config.ts" -Value $updatedViteConfigContent
Write-Host "✅ Updated NodeFortuneSpa\vite.config.ts to use NextJS-compatible setup" -ForegroundColor Green

# Update the appsettings.json to include CORS for browser telemetry
$appsettingsPath = "ai-app-starter-aspire.AppHost\appsettings.json"
$appsettingsContent = Get-Content -Path $appsettingsPath -Raw | ConvertFrom-Json

# Check if Dashboard property exists
if ($appsettingsContent.Dashboard) {
    # Dashboard section already exists, check if Otlp section exists
    if ($appsettingsContent.Dashboard.Otlp) {
        Write-Host "⚠️ Dashboard/Otlp section already exists in appsettings.json. Please manually verify CORS settings." -ForegroundColor Yellow
    } else {
        # Add Otlp section to existing Dashboard section
        $appsettingsContent.Dashboard | Add-Member -MemberType NoteProperty -Name "Otlp" -Value @{
            Cors = @{
                AllowedOrigins = "*"
                AllowedHeaders = "*"
            }
        }
        $appsettingsContent | ConvertTo-Json -Depth 10 | Set-Content -Path $appsettingsPath
        Write-Host "✅ Added OTLP CORS settings to existing Dashboard section in appsettings.json" -ForegroundColor Green
    }
} else {
    # Dashboard section doesn't exist, add it
    $appsettingsContent | Add-Member -MemberType NoteProperty -Name "Dashboard" -Value @{
        Otlp = @{
            Cors = @{
                AllowedOrigins = "*"
                AllowedHeaders = "*"
            }
        }
    }
    $appsettingsContent | ConvertTo-Json -Depth 10 | Set-Content -Path $appsettingsPath
    Write-Host "✅ Added Dashboard section with OTLP CORS settings to appsettings.json" -ForegroundColor Green
}

Write-Host "✅ OpenTelemetry configuration updated to be NextJS-compatible" -ForegroundColor Green
Write-Host "ℹ️ Please see ASPIRE_NEXTJS_OTLP.md for details on the implementation" -ForegroundColor Cyan
