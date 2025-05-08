#!/usr/bin/env pwsh
# This script starts the Node.js applications directly for testing
# outside of the Aspire orchestration environment

Write-Host "Setting up dependencies..." -ForegroundColor Yellow
npm run bootstrap

Write-Host "Setting up database..." -ForegroundColor Yellow
Push-Location NodeFortuneApi
npm run setup-db
Pop-Location

Write-Host "Starting NodeFortuneApi directly..." -ForegroundColor Green
$apiProcess = Start-Process pwsh -ArgumentList "-Command cd $((Get-Location).Path)\NodeFortuneApi && npm run dev" -PassThru -WindowStyle Normal

# Wait a bit for the API to start up
Start-Sleep -Seconds 3

Write-Host "Starting NodeFortuneSpa directly..." -ForegroundColor Green  
$spaProcess = Start-Process pwsh -ArgumentList "-Command cd $((Get-Location).Path)\NodeFortuneSpa && npm run dev" -PassThru -WindowStyle Normal

Write-Host "Both services started." -ForegroundColor Yellow
Write-Host "API should be available at: http://localhost:4000" -ForegroundColor Cyan
Write-Host "SPA should be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services and exit..." -ForegroundColor Yellow

try {
    # Keep running until user presses Ctrl+C
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    # Clean up
    if ($null -ne $apiProcess -and !$apiProcess.HasExited) {
        Write-Host "Stopping API process..." -ForegroundColor Yellow
        Stop-Process -Id $apiProcess.Id -Force
    }
    
    if ($null -ne $spaProcess -and !$spaProcess.HasExited) {
        Write-Host "Stopping SPA process..." -ForegroundColor Yellow
        Stop-Process -Id $spaProcess.Id -Force
    }
    
    Write-Host "All services stopped." -ForegroundColor Green
}
