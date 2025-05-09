# PowerShell script to update imports in index.ts and vite.config.ts

Write-Host "Updating imports to use NextJS-compatible tracing..." -ForegroundColor Yellow

# Update the main API file to use the NextJS-compatible tracing
$apiIndexFile = "c:\github\ai-app-starter-aspire\NodeFortuneApi\src\index.ts"
$apiIndexContent = Get-Content $apiIndexFile -Raw
$apiIndexContent = $apiIndexContent -replace "import './tracing-[a-zA-Z0-9-]*';", "import './tracing-nextjs-compatible';"
Set-Content -Path $apiIndexFile -Value $apiIndexContent

# Update the Vite configuration to use the NextJS-compatible tracing
$viteConfigFile = "c:\github\ai-app-starter-aspire\NodeFortuneSpa\vite.config.ts"
$viteConfigContent = Get-Content $viteConfigFile -Raw
$viteConfigContent = $viteConfigContent -replace "import './[a-zA-Z0-9-]*';", "import './vite-otel-nextjs';"
Set-Content -Path $viteConfigFile -Value $viteConfigContent

Write-Host "Imports updated to use NextJS-compatible tracing!" -ForegroundColor Green
