# PowerShell script to update imports in index.ts and vite.config.ts

Write-Host "Updating imports to use NextJS-compatible tracing..." -ForegroundColor Yellow

# Update the main API file to use the NextJS-compatible tracing
\ = "c:\github\ai-app-starter-aspire\NodeFortuneApi\src\index.ts"
\ = Get-Content \ -Raw
\ = \ -replace "import './tracing-[a-zA-Z0-9-]*';", "import './tracing-nextjs-compatible';"
Set-Content -Path \ -Value \

# Update the Vite configuration to use the NextJS-compatible tracing
\ = "c:\github\ai-app-starter-aspire\NodeFortuneSpa\vite.config.ts"
\ = Get-Content \ -Raw
\ = \ -replace "import './[a-zA-Z0-9-]*';", "import './vite-otel-nextjs';"
Set-Content -Path \ -Value \

Write-Host "Imports updated to use NextJS-compatible tracing!" -ForegroundColor Green
